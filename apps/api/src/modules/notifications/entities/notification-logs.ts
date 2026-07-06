import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
} from 'drizzle-orm/pg-core';

export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull(),
  recipient: varchar('recipient', { length: 320 }).notNull(),
  subject: varchar('subject', { length: 255 }),
  payload: jsonb('payload'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
