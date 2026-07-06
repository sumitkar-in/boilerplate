import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  provisionTestTenant,
  teardownTestTenant,
  type TestTenant,
} from './utils/test-db';
import { createTestApp } from './utils/test-app';

describe('Employees CRUD (e2e)', () => {
  let app: INestApplication<App>;
  let tenant: TestTenant;
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    tenant = await provisionTestTenant({ features: ['employees'] });

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

  it('rejects creating an employee with missing fields', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400);
  });

  it('rejects an invalid email', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Ada Lovelace',
        phone: '+15551234567',
        email: 'not-an-email',
      })
      .expect(400);
  });

  it('rejects a name longer than the database column allows', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'x'.repeat(256),
        phone: '+15551234567',
        email: 'ada@example.com',
      })
      .expect(400);
  });

  it('creates, lists, fetches, updates, and deletes an employee', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Ada Lovelace',
        phone: '+15551234567',
        email: 'ada@example.com',
      })
      .expect(201);
    expect(created.body).toMatchObject({
      name: 'Ada Lovelace',
      phone: '+15551234567',
      email: 'ada@example.com',
    });
    const employeeId = created.body.id;

    const list = await request(app.getHttpServer())
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    // List endpoints return the paginated shape { rows, total, limit, offset }.
    expect(list.body.rows.map((e: { id: string }) => e.id)).toContain(
      employeeId,
    );

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/employees/${employeeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(fetched.body.id).toBe(employeeId);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/employees/${employeeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Ada King' })
      .expect(200);
    expect(updated.body.name).toBe('Ada King');
    expect(new Date(updated.body.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(created.body.updatedAt).getTime(),
    );

    await request(app.getHttpServer())
      .delete(`/api/v1/employees/${employeeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200, { ok: true });

    await request(app.getHttpServer())
      .get(`/api/v1/employees/${employeeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('404s updating/deleting an employee that does not exist', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/employees/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Nope' })
      .expect(404);

    await request(app.getHttpServer())
      .delete('/api/v1/employees/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
