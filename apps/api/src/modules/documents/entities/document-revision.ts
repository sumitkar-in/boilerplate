import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { documentPage, type DocumentFormat } from './document-page';

export const documentRevision = pgTable('document_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id')
    .notNull()
    .references(() => documentPage.id, { onDelete: 'cascade' }),
  version: varchar('version', { length: 32 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  format: varchar('format', { length: 24 }).notNull().$type<DocumentFormat>(),
  content: text('content').notNull(),
  labels: jsonb('labels').notNull().default([]).$type<string[]>(),
  savedBy: uuid('saved_by'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
