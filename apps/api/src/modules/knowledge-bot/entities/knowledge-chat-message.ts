import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export type KnowledgeChatRole = 'user' | 'assistant';

export const knowledgeChatMessage = pgTable(
  'knowledge_chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    role: varchar('role', { length: 24 }).notNull().$type<KnowledgeChatRole>(),
    content: text('content').notNull(),
    model: varchar('model', { length: 128 }),
    citations: jsonb('citations')
      .notNull()
      .default([])
      .$type<Array<Record<string, string>>>(),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('knowledge_chat_messages_created_at_idx').on(table.createdAt.desc()),
  ],
);
