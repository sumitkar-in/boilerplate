import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import * as nodemailer from 'nodemailer';
import {
  NOTIFICATIONS_QUEUE,
  NotificationJobPayload,
} from './notifications.types';
import { TenantDbService } from '../../../core/database/tenant-db.service';
import { notificationLogs } from '../entities/notification-logs';
import { eq } from 'drizzle-orm';

@Processor(NOTIFICATIONS_QUEUE, { concurrency: 5 })
export class NotificationsProcessor extends WorkerHost {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly logger: PinoLogger,
    private readonly tenantDb: TenantDbService,
  ) {
    super();
    this.logger.setContext(NotificationsProcessor.name);
    // Development fallback
    this.transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
  }

  async process(job: Job<NotificationJobPayload>) {
    this.logger.info(`Processing notification job ${job.id}`);
    const data = job.data;

    const tenant = data.tenant;

    try {
      if (data.type === 'email') {
        await this.handleEmail(data);
      } else if (data.type === 'webhook') {
        await this.handleWebhook(data);
      } else {
        const typeStr = JSON.stringify(
          (data as Record<string, unknown>).type ?? 'unknown',
        );
        throw new Error(`Unknown notification type: ${typeStr}`);
      }

      await this.tenantDb.withTenantDb(tenant, async (db) => {
        await db
          .update(notificationLogs)
          .set({ status: 'sent', updatedAt: new Date() })
          .where(eq(notificationLogs.id, data.logId));
      });

      this.logger.info(`Notification ${data.logId} sent successfully`);
    } catch (error: unknown) {
      this.logger.error(`Failed to send notification ${data.logId}`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.tenantDb.withTenantDb(tenant, async (db) => {
        await db
          .update(notificationLogs)
          .set({
            status: 'failed',
            error: errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(notificationLogs.id, data.logId));
      });

      throw error;
    }
  }

  private async handleEmail(
    data: import('./notifications.types').SendEmailJobData,
  ) {
    const info = (await this.transporter.sendMail({
      from: '"System" <no-reply@example.com>',
      to: data.recipient,
      subject: data.subject,
      text: data.body,
    })) as Record<string, unknown>;
    const messageInfo = info.message;
    const preview =
      typeof messageInfo === 'object' && messageInfo !== null
        ? (messageInfo as Buffer).toString()
        : typeof messageInfo === 'string'
          ? messageInfo
          : JSON.stringify(messageInfo || '');
    this.logger.info(`Email sent to ${data.recipient}. Preview: ${preview}`);
  }

  private async handleWebhook(
    data: import('./notifications.types').SendWebhookJobData,
  ) {
    const response = await fetch(data.recipient, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data.payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook responded with status ${response.status}`);
    }
    this.logger.info(`Webhook sent to ${data.recipient}`);
  }
}
