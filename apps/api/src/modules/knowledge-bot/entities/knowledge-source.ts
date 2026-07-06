import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const KNOWLEDGE_SOURCE_KINDS = [
  'text',
  'url',
  'file',
  'database',
  'api',
] as const;
export type KnowledgeSourceKind = (typeof KNOWLEDGE_SOURCE_KINDS)[number];

export const knowledgeSource = pgTable(
  'knowledge_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    kind: varchar('kind', { length: 32 })
      .notNull()
      .$type<KnowledgeSourceKind>(),
    content: text('content').notNull().default(''),
    metadata: jsonb('metadata')
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('knowledge_sources_kind_idx').on(table.kind),
    index('knowledge_sources_updated_at_idx').on(table.updatedAt.desc()),
  ],
);
