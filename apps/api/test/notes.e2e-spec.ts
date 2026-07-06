import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  provisionTestTenant,
  teardownTestTenant,
  type TestTenant,
} from './utils/test-db';
import { createTestApp } from './utils/test-app';

describe('Notes CRUD (e2e)', () => {
  let app: INestApplication<App>;
  let tenant: TestTenant;
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    tenant = await provisionTestTenant({ features: ['notes'] });

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

  it('rejects creating a note with missing fields', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/notes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400);
  });

  it('rejects a title longer than the database column allows', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/notes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'x'.repeat(256), content: 'body' })
      .expect(400);
  });

  it('creates, lists, fetches, updates, and deletes a note', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/notes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'First note', content: 'Hello world' })
      .expect(201);
    expect(created.body).toMatchObject({
      title: 'First note',
      content: 'Hello world',
    });
    const noteId = created.body.id;

    const list = await request(app.getHttpServer())
      .get('/api/v1/notes')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    // List endpoints return the paginated shape from crud listAndCount:
    // { rows, total, limit, offset }.
    expect(list.body.total).toBeGreaterThanOrEqual(1);
    expect(list.body.rows.map((n: { id: string }) => n.id)).toContain(noteId);

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/notes/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(fetched.body.id).toBe(noteId);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/notes/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Updated title' })
      .expect(200);
    expect(updated.body.title).toBe('Updated title');
    expect(new Date(updated.body.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(created.body.updatedAt).getTime(),
    );

    await request(app.getHttpServer())
      .delete(`/api/v1/notes/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200, { ok: true });

    await request(app.getHttpServer())
      .get(`/api/v1/notes/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('404s updating/deleting a note that does not exist', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/notes/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Nope' })
      .expect(404);

    await request(app.getHttpServer())
      .delete('/api/v1/notes/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
