import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { task } from './task';

export const taskActivity = pgTable('task_activity', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => task.id, { onDelete: 'cascade' }),
  actorUserId: uuid('actor_user_id'),
  action: varchar('action', { length: 64 }).notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata')
    .notNull()
    .default({})
    .$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
