import {
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
} from 'drizzle-orm/pg-core';

export const taskProject = pgTable(
  'task_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 160 }).notNull(),
    code: varchar('code', { length: 12 }).notNull().unique(),
    description: text('description').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('task_projects_name_idx').on(table.name),
    index('task_projects_code_idx').on(table.code),
  ],
);
