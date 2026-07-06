import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { taskProject } from './task-project';

export const TASK_CUSTOM_FIELD_TYPES = [
  'text',
  'number',
  'date',
  'select',
] as const;
export type TaskCustomFieldType = (typeof TASK_CUSTOM_FIELD_TYPES)[number];

export const taskCustomField = pgTable(
  'task_custom_fields',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => taskProject.id, { onDelete: 'cascade' }),
    fieldKey: varchar('field_key', { length: 64 }).notNull(),
    label: varchar('label', { length: 255 }).notNull(),
    type: varchar('type', { length: 16 })
      .notNull()
      .default('text')
      .$type<TaskCustomFieldType>(),
    options: jsonb('options').notNull().default([]).$type<string[]>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('task_custom_fields_project_created_idx').on(
      table.projectId,
      table.createdAt,
    ),
    uniqueIndex('task_custom_fields_project_field_key_idx').on(
      table.projectId,
      table.fieldKey,
    ),
  ],
);
