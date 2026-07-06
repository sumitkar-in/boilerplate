import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  provisionTestTenant,
  teardownTestTenant,
  type TestTenant,
} from './utils/test-db';
import { createTestApp } from './utils/test-app';

describe('Calendar CRUD (e2e)', () => {
  let app: INestApplication<App>;
  let tenant: TestTenant;
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    tenant = await provisionTestTenant({ features: ['calendar'] });

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

  it('rejects creating a calendar event with missing required fields', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/calendar')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Missing dates' })
      .expect(400);
  });

  it('creates, lists, fetches, updates, and deletes a calendar event', async () => {
    const startAt = new Date().toISOString();
    const endAt = new Date(Date.now() + 3600000).toISOString();

    const created = await request(app.getHttpServer())
      .post('/api/v1/calendar')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Test Meeting', startAt, endAt, type: 'meeting' })
      .expect(201);

    expect(created.body).toMatchObject({
      title: 'Test Meeting',
      type: 'meeting',
    });
    const eventId = created.body.id;

    const list = await request(app.getHttpServer())
      .get('/api/v1/calendar')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(list.body.length).toBeGreaterThanOrEqual(1);
    expect(list.body.map((e: { id: string }) => e.id)).toContain(eventId);

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/calendar/${eventId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(fetched.body.id).toBe(eventId);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/calendar/${eventId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Updated Meeting' })
      .expect(200);
    expect(updated.body.title).toBe('Updated Meeting');

    await request(app.getHttpServer())
      .delete(`/api/v1/calendar/${eventId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200, { ok: true });

    await request(app.getHttpServer())
      .get(`/api/v1/calendar/${eventId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('shows tenant public events and masks other users private events as blocked', async () => {
    const memberEmail = `member-${tenant.slug}@e2e.test`;
    const memberPassword = 'MemberPassw0rd!';

    await request(app.getHttpServer())
      .post('/api/v1/auth/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: memberEmail,
        fullName: 'Calendar Member',
        role: 'member',
        password: memberPassword,
      })
      .expect(201);

    const memberLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-id', tenant.slug)
      .send({ email: memberEmail, password: memberPassword })
      .expect(201);
    const memberToken = memberLogin.body.accessToken as string;

    const startAt = new Date(Date.now() + 86400000).toISOString();
    const endAt = new Date(Date.now() + 90000000).toISOString();

    const publicEvent = await request(app.getHttpServer())
      .post('/api/v1/calendar')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Tenant Town Hall',
        description: 'Visible to everyone',
        startAt,
        endAt,
        visibility: 'public',
      })
      .expect(201);

    const privateEvent = await request(app.getHttpServer())
      .post('/api/v1/calendar')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Secret Planning',
        description: 'Hidden details',
        startAt,
        endAt,
        visibility: 'private',
        location: 'Board room',
      })
      .expect(201);

    const memberList = await request(app.getHttpServer())
      .get('/api/v1/calendar')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    const listedPublic = memberList.body.find(
      (event: { id: string }) => event.id === publicEvent.body.id,
    );
    const listedPrivate = memberList.body.find(
      (event: { id: string }) => event.id === privateEvent.body.id,
    );

    expect(listedPublic).toMatchObject({
      title: 'Tenant Town Hall',
      visibility: 'public',
      isOwner: false,
      isMasked: false,
    });
    expect(listedPrivate).toMatchObject({
      title: 'Blocked',
      description: '',
      type: 'block',
      visibility: 'private',
      location: '',
      meetingLink: '',
      attendees: [],
      isOwner: false,
      isMasked: true,
    });
    expect(listedPrivate).not.toMatchObject({
      title: 'Secret Planning',
      description: 'Hidden details',
      location: 'Board room',
    });

    const fetchedPrivate = await request(app.getHttpServer())
      .get(`/api/v1/calendar/${privateEvent.body.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(fetchedPrivate.body).toMatchObject({
      id: privateEvent.body.id,
      title: 'Blocked',
      isMasked: true,
      attendees: [],
    });

    await request(app.getHttpServer())
      .delete(`/api/v1/calendar/${privateEvent.body.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);
  });
});
