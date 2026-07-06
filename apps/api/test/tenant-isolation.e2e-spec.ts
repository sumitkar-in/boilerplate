import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  provisionTestTenant,
  teardownTestTenant,
  type TestTenant,
} from './utils/test-db';
import { createTestApp } from './utils/test-app';

describe('Tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let accessTokenA: string;
  let accessTokenB: string;

  beforeAll(async () => {
    app = await createTestApp();
    tenantA = await provisionTestTenant({ features: ['notes'] });
    tenantB = await provisionTestTenant({ features: [] });

    const loginA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', tenantA.slug)
      .send({ email: tenantA.ownerEmail, password: tenantA.ownerPassword })
      .expect(201);
    accessTokenA = loginA.body.accessToken;

    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', tenantB.slug)
      .send({ email: tenantB.ownerEmail, password: tenantB.ownerPassword })
      .expect(201);
    accessTokenB = loginB.body.accessToken;
  });

  afterAll(async () => {
    await teardownTestTenant(tenantA);
    await teardownTestTenant(tenantB);
    await app.close();
  });

  it("a tenant's owner cannot log in against another tenant's slug (no membership there)", async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', tenantB.slug)
      .send({ email: tenantA.ownerEmail, password: tenantA.ownerPassword })
      .expect(401);
  });

  it("an authenticated request's tenant identity comes from the access token, not a spoofable header", async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/tenants/me')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .set('x-tenant-id', tenantB.slug) // attempt to override — must be ignored
      .expect(200);

    expect(res.body.tenantId).toBe(tenantA.tenantId);
    expect(res.body.tenantSlug).toBe(tenantA.slug);
  });

  it('returns public branding by slug without a tenant resolver header', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/tenants/branding')
      .query({ slug: tenantA.slug })
      .expect(200);

    expect(res.body).toEqual({
      companyName: null,
      brandColor: '#35abc0',
      logoUrl: null,
      settings: {},
    });
  });

  it('returns null public branding for unknown slugs instead of a 404', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/tenants/branding')
      .query({ slug: 'missing-tenant' })
      .expect(200);

    expect(res.body).toBeNull();
  });

  it('feature flags are isolated per tenant — tenant A has notes enabled, tenant B does not', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/notes')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/notes')
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(403);
  });

  it("tenant B's owner cannot see tenant A's membership list", async () => {
    const resA = await request(app.getHttpServer())
      .get('/api/v1/tenants/members')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .expect(200);
    const resB = await request(app.getHttpServer())
      .get('/api/v1/tenants/members')
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(200);

    const emailsSeenByB = resB.body.rows.map((m: { email: string }) => m.email);
    expect(emailsSeenByB).not.toContain(tenantA.ownerEmail);
    expect(resA.body.rows.map((m: { email: string }) => m.email)).toContain(
      tenantA.ownerEmail,
    );
  });
});
