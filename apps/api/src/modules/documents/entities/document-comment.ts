import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { documentPage } from './document-page';

export const documentComment = pgTable('document_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id')
    .notNull()
    .references(() => documentPage.id, { onDelete: 'cascade' }),
  authorUserId: uuid('author_user_id'),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
