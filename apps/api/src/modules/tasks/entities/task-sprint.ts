import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { taskProject } from './task-project';

export const TASK_SPRINT_STATUSES = ['planned', 'active', 'closed'] as const;
export type TaskSprintStatus = (typeof TASK_SPRINT_STATUSES)[number];

export const taskSprint = pgTable(
  'task_sprints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => taskProject.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    goal: text('goal').notNull().default(''),
    status: varchar('status', { length: 24 })
      .notNull()
      .default('planned')
      .$type<TaskSprintStatus>(),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('task_sprints_project_status_idx').on(table.projectId, table.status),
    index('task_sprints_project_dates_idx').on(
      table.projectId,
      table.startDate,
      table.endDate,
    ),
  ],
);
