import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  NOTIFICATIONS_QUEUE,
  NotificationJobPayload,
} from './jobs/notifications.types';
import { TenantDbService } from '../../core/database/tenant-db.service';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { notificationLogs } from './entities/notification-logs';
import { ListQueryDto } from '../../core/common/query/list-query.dto';
import { listAndCount } from '../../core/common/crud/crud.helpers';
import type { ListQueryConfig } from '../../core/common/query/list-query.builder';

const listConfig: ListQueryConfig = {
  fields: {
    recipient: notificationLogs.recipient,
    subject: notificationLogs.subject,
    status: notificationLogs.status,
    createdAt: notificationLogs.createdAt,
  },
  searchFields: ['recipient', 'subject'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly queue: Queue<NotificationJobPayload>,
    private readonly tenantDb: TenantDbService,
  ) {}

  async findAll(tenant: TenantContext, query: ListQueryDto) {
    return this.tenantDb.withTenantDb(tenant, (db) =>
      listAndCount(db, notificationLogs, query, listConfig),
    );
  }

  async sendEmail(
    tenant: TenantContext,
    recipient: string,
    subject: string,
    body: string,
  ) {
    let logId = '';
    await this.tenantDb.withTenantDb(tenant, async (db) => {
      const [inserted] = await db
        .insert(notificationLogs)
        .values({
          type: 'email',
          recipient,
          subject,
          payload: { subject, body },
        })
        .returning({ id: notificationLogs.id });
      logId = inserted.id;
    });

    await this.queue.add('email', {
      type: 'email',
      tenant,
      logId,
      recipient,
      subject,
      body,
    });

    return logId;
  }

  async sendWebhook(
    tenant: TenantContext,
    recipient: string,
    payload: unknown,
  ) {
    let logId = '';
    await this.tenantDb.withTenantDb(tenant, async (db) => {
      const [inserted] = await db
        .insert(notificationLogs)
        .values({
          type: 'webhook',
          recipient,
          payload,
        })
        .returning({ id: notificationLogs.id });
      logId = inserted.id;
    });

    await this.queue.add('webhook', {
      type: 'webhook',
      tenant,
      logId,
      recipient,
      payload,
    });

    return logId;
  }
}
