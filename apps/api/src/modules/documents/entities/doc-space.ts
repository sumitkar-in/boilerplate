import { pgTable, timestamp, uuid, varchar, text } from 'drizzle-orm/pg-core';

export const docSpace = pgTable('doc_spaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 32 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
