import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { task } from './task';

export const taskComment = pgTable('task_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => task.id, { onDelete: 'cascade' }),
  authorUserId: uuid('author_user_id'),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
