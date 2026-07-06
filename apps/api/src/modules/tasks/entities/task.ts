import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
} from 'drizzle-orm/pg-core';
import { taskProject } from './task-project';
import { taskSprint } from './task-sprint';

export const TASK_STATUSES = [
  'backlog',
  'todo',
  'in_progress',
  'review',
  'done',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = [
  'lowest',
  'low',
  'medium',
  'high',
  'urgent',
] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_TYPES = ['task', 'bug', 'story', 'epic', 'subtask'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const task = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskKey: varchar('task_key', { length: 32 }).notNull().unique(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => taskProject.id),
    sprintId: uuid('sprint_id').references(() => taskSprint.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull().default(''),
    type: varchar('type', { length: 24 })
      .notNull()
      .default('task')
      .$type<TaskType>(),
    status: varchar('status', { length: 32 })
      .notNull()
      .default('todo')
      .$type<TaskStatus>(),
    priority: varchar('priority', { length: 24 })
      .notNull()
      .default('medium')
      .$type<TaskPriority>(),
    primaryAssigneeId: uuid('primary_assignee_id'),
    assigneeIds: jsonb('assignee_ids').notNull().default([]).$type<string[]>(),
    watcherIds: jsonb('watcher_ids').notNull().default([]).$type<string[]>(),
    labels: jsonb('labels').notNull().default([]).$type<string[]>(),
    customFields: jsonb('custom_fields')
      .notNull()
      .default({})
      .$type<Record<string, string>>(),
    dueDate: timestamp('due_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('tasks_status_idx').on(table.status),
    index('tasks_project_id_idx').on(table.projectId),
    index('tasks_sprint_id_idx').on(table.sprintId),
    index('tasks_priority_idx').on(table.priority),
    index('tasks_type_idx').on(table.type),
    index('tasks_created_at_idx').on(table.createdAt.desc()),
  ],
);
