import { INestApplication } from '@nestjs/common';
import { authenticator } from 'otplib';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  provisionTestTenant,
  teardownTestTenant,
  type TestTenant,
} from './utils/test-db';
import { createTestApp } from './utils/test-app';

describe('Two-factor authentication (e2e)', () => {
  let app: INestApplication<App>;
  let tenant: TestTenant;
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    tenant = await provisionTestTenant();

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', tenant.slug)
      .send({ email: tenant.ownerEmail, password: tenant.ownerPassword })
      .expect(201);
    accessToken = login.body.accessToken;
  });

  afterAll(async () => {
    await teardownTestTenant(tenant);
    await app.close();
  });

  let secret: string;
  let backupCodes: string[];

  it('setup returns a TOTP secret, otpauth URL, and QR code', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    expect(res.body.secret).toEqual(expect.any(String));
    expect(res.body.otpauthUrl).toContain('otpauth://totp/');
    expect(res.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    secret = res.body.secret;
  });

  it('rejects enabling with a wrong code', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/enable')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: '000000' })
      .expect(401);
  });

  it('enables 2FA with the right code and returns backup codes', async () => {
    const code = authenticator.generate(secret);
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/enable')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code })
      .expect(201);

    expect(res.body.backupCodes).toHaveLength(10);
    backupCodes = res.body.backupCodes;
  });

  it('login now returns twoFactorRequired instead of tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', tenant.slug)
      .send({ email: tenant.ownerEmail, password: tenant.ownerPassword })
      .expect(201);

    expect(res.body).toEqual({
      twoFactorRequired: true,
      partialToken: expect.any(String),
    });
  });

  it('rejects verify-login with a wrong TOTP code', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', tenant.slug)
      .send({ email: tenant.ownerEmail, password: tenant.ownerPassword })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/verify-login')
      .send({ partialToken: login.body.partialToken, code: '000000' })
      .expect(401);
  });

  it('accepts verify-login with the correct TOTP code and issues full tokens', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', tenant.slug)
      .send({ email: tenant.ownerEmail, password: tenant.ownerPassword })
      .expect(201);

    const verify = await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/verify-login')
      .send({
        partialToken: login.body.partialToken,
        code: authenticator.generate(secret),
      })
      .expect(201);

    expect(verify.body.accessToken).toEqual(expect.any(String));
    expect(verify.body.refreshToken).toEqual(expect.any(String));
  });

  it('accepts a one-time backup code, then rejects reusing it', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', tenant.slug)
      .send({ email: tenant.ownerEmail, password: tenant.ownerPassword })
      .expect(201);

    const [backupCode] = backupCodes;
    await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/verify-login')
      .send({ partialToken: login.body.partialToken, code: backupCode })
      .expect(201);

    const secondLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', tenant.slug)
      .send({ email: tenant.ownerEmail, password: tenant.ownerPassword })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/verify-login')
      .send({ partialToken: secondLogin.body.partialToken, code: backupCode })
      .expect(401);
  });

  it('rejects disabling 2FA with the wrong password', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', tenant.slug)
      .send({ email: tenant.ownerEmail, password: tenant.ownerPassword })
      .expect(201);
    const verify = await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/verify-login')
      .send({
        partialToken: login.body.partialToken,
        code: authenticator.generate(secret),
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/disable')
      .set('Authorization', `Bearer ${verify.body.accessToken}`)
      .send({ password: 'wrong-password' })
      .expect(401);
  });

  it('disables 2FA with the correct password, after which login no longer requires it', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', tenant.slug)
      .send({ email: tenant.ownerEmail, password: tenant.ownerPassword })
      .expect(201);
    const verify = await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/verify-login')
      .send({
        partialToken: login.body.partialToken,
        code: authenticator.generate(secret),
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/disable')
      .set('Authorization', `Bearer ${verify.body.accessToken}`)
      .send({ password: tenant.ownerPassword })
      .expect(201);

    const finalLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', tenant.slug)
      .send({ email: tenant.ownerEmail, password: tenant.ownerPassword })
      .expect(201);

    expect(finalLogin.body.twoFactorRequired).toBe(false);
  });
});
