import type { TenantContext } from '../../../core/tenants/tenant-context';

export const NOTIFICATIONS_QUEUE = 'notifications-queue';

export interface BaseNotificationJob {
  tenant: TenantContext;
  logId: string;
}

export interface SendEmailJobData extends BaseNotificationJob {
  type: 'email';
  recipient: string;
  subject: string;
  body: string;
}

export interface SendWebhookJobData extends BaseNotificationJob {
  type: 'webhook';
  recipient: string;
  payload: any;
}

export type NotificationJobPayload = SendEmailJobData | SendWebhookJobData;
