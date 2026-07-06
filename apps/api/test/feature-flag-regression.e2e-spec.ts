import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { provisionTestTenant, teardownTestTenant } from './utils/test-db';
import { createTestApp } from './utils/test-app';

// Regression check: the pre-existing FeatureFlagGuard / @RequireFeature()
// gate (notes module) must keep working correctly now that TenantContext
// is populated by the new auth layer (AuthContextMiddleware) instead of
// being unset — see skills/feature-flags/SKILL.md.
describe('Feature flag gating regression (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('403s a tenant without the feature enabled', async () => {
    const tenant = await provisionTestTenant({ features: [] });
    try {
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-tenant-id', tenant.slug)
        .send({ email: tenant.ownerEmail, password: tenant.ownerPassword })
        .expect(201);

      await request(app.getHttpServer())
        .get('/api/v1/notes')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(403);
    } finally {
      await teardownTestTenant(tenant);
    }
  });

  it('200s a tenant with the feature enabled', async () => {
    const tenant = await provisionTestTenant({ features: ['notes'] });
    try {
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-tenant-id', tenant.slug)
        .send({ email: tenant.ownerEmail, password: tenant.ownerPassword })
        .expect(201);

      await request(app.getHttpServer())
        .get('/api/v1/notes')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);
    } finally {
      await teardownTestTenant(tenant);
    }
  });
});
