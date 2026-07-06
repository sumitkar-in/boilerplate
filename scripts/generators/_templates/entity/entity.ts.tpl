import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';

// Owned by the {{moduleKey}} module — tenant-schema table, created by
// migrations/{{migrationFile}}. No other module may import this table
// directly; cross-feature access goes through {{ModuleName}}Service.
// See: skills/tenant-data-access/SKILL.md
export const {{entityName}} = pgTable('{{entitySnake}}', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // TODO: add this table's columns.
});
