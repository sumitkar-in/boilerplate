import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  provisionTestTenant,
  teardownTestTenant,
  type TestTenant,
} from './utils/test-db';
import { createTestApp } from './utils/test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let tenant: TestTenant;

  beforeAll(async () => {
    app = await createTestApp();
    tenant = await provisionTestTenant({ features: ['notes'] });
  });

  afterAll(async () => {
    await teardownTestTenant(tenant);
    await app.close();
  });

  async function loginOwner() {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', tenant.slug)
      .send({ email: tenant.ownerEmail, password: tenant.ownerPassword })
      .expect(201);
    return res.body as { accessToken: string; refreshToken: string };
  }

  it('rejects login with a wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', tenant.slug)
      .send({ email: tenant.ownerEmail, password: 'totally-wrong' })
      .expect(401);
  });

  it('rejects requests for an unknown tenant slug', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', 'does-not-exist')
      .send({ email: tenant.ownerEmail, password: tenant.ownerPassword })
      .expect(404);
  });

  it('logs the owner in and exposes /auth/me with the right role', async () => {
    const { accessToken } = await loginOwner();

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(me.body).toMatchObject({
      email: tenant.ownerEmail,
      tenantSlug: tenant.slug,
      role: 'owner',
    });
  });

  it('rejects protected routes with no token', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  describe('invite -> accept -> RBAC', () => {
    let memberAccessToken: string;

    it('lets an owner invite a new member', async () => {
      const { accessToken } = await loginOwner();

      const invite = await request(app.getHttpServer())
        .post('/api/v1/auth/invites')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: `member-${tenant.slug}@e2e.test`, role: 'member' })
        .expect(201);

      expect(invite.body.inviteToken).toEqual(expect.any(String));

      const accept = await request(app.getHttpServer())
        .post('/api/v1/auth/invites/accept')
        .set('x-tenant-id', tenant.slug)
        .send({
          token: invite.body.inviteToken,
          password: 'MemberPass1!',
          fullName: 'A Member',
        })
        .expect(201);

      expect(accept.body.accessToken).toEqual(expect.any(String));
      memberAccessToken = accept.body.accessToken;
    });

    it('allows the owner on an admin-gated route', async () => {
      const { accessToken } = await loginOwner();
      await request(app.getHttpServer())
        .get('/api/v1/tenants/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('denies a plain member on the same admin-gated route', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tenants/members')
        .set('Authorization', `Bearer ${memberAccessToken}`)
        .expect(403);
    });

    it('still lets the member reach a feature-gated (not role-gated) route', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notes')
        .set('Authorization', `Bearer ${memberAccessToken}`)
        .expect(200);
    });
  });

  describe('refresh token rotation', () => {
    it('rotates on use and rejects reuse of the old token (theft detection)', async () => {
      const { refreshToken: firstRefresh } = await loginOwner();

      const rotated = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: firstRefresh })
        .expect(201);
      const secondRefresh = rotated.body.refreshToken as string;
      expect(secondRefresh).not.toBe(firstRefresh);

      // Reusing the now-revoked first token must fail...
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: firstRefresh })
        .expect(401);

      // ...and revokes the whole family, so even the valid second token
      // (issued from the same chain) stops working.
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: secondRefresh })
        .expect(401);
    });

    it('logout revokes the refresh token', async () => {
      const { accessToken, refreshToken } = await loginOwner();

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('tenant-mandated 2FA', () => {
    afterEach(async () => {
      // Reset so this describe block doesn't leak state into later tests.
      const { accessToken } = await loginOwner();
      await request(app.getHttpServer())
        .patch('/api/v1/tenants/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ settings: { security: { requireTwoFactor: false } } })
        .expect(200);
    });

    it('flags twoFactorSetupRequired on login once the tenant turns the setting on', async () => {
      const { accessToken: ownerToken } = await loginOwner();
      await request(app.getHttpServer())
        .patch('/api/v1/tenants/settings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ settings: { security: { requireTwoFactor: true } } })
        .expect(200);

      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-tenant-id', tenant.slug)
        .send({ email: tenant.ownerEmail, password: tenant.ownerPassword })
        .expect(201);

      expect(login.body.twoFactorSetupRequired).toBe(true);
    });

    it('surfaces twoFactorSetupRequired on /auth/me for an existing session too', async () => {
      const { accessToken: ownerToken } = await loginOwner();
      await request(app.getHttpServer())
        .patch('/api/v1/tenants/settings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ settings: { security: { requireTwoFactor: true } } })
        .expect(200);

      const me = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(me.body.twoFactorSetupRequired).toBe(true);
    });

    it('does not flag twoFactorSetupRequired when the tenant setting is off', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-tenant-id', tenant.slug)
        .send({ email: tenant.ownerEmail, password: tenant.ownerPassword })
        .expect(201);

      expect(login.body.twoFactorSetupRequired).toBeUndefined();
    });
  });
});
