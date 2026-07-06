import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
} from 'drizzle-orm/pg-core';
import { docSpace } from './doc-space';

export const DOCUMENT_FORMATS = ['markdown', 'rich_text'] as const;
export type DocumentFormat = (typeof DOCUMENT_FORMATS)[number];

export const documentPage = pgTable(
  'document_pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => docSpace.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    format: varchar('format', { length: 24 })
      .notNull()
      .default('markdown')
      .$type<DocumentFormat>(),
    content: text('content').notNull().default(''),
    version: varchar('version', { length: 32 }).notNull().default('1'),
    labels: jsonb('labels').notNull().default([]).$type<string[]>(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('document_pages_space_idx').on(table.spaceId),
    index('document_pages_parent_idx').on(table.parentId),
    index('document_pages_updated_at_idx').on(table.updatedAt.desc()),
  ],
);
