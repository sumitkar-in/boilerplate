import { jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const EMPLOYEE_CUSTOM_FIELD_TYPES = [
  'text',
  'number',
  'date',
  'select',
] as const;
export type EmployeeCustomFieldType =
  (typeof EMPLOYEE_CUSTOM_FIELD_TYPES)[number];

// Tenant-level definitions of the extra columns an admin added from the UI.
// Employee rows store the values in employees.custom_fields keyed by field_key.
export const employeeCustomField = pgTable('employee_custom_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  fieldKey: varchar('field_key', { length: 64 }).notNull().unique(),
  label: varchar('label', { length: 255 }).notNull(),
  type: varchar('type', { length: 16 })
    .notNull()
    .default('text')
    .$type<EmployeeCustomFieldType>(),
  // Only used by 'select' fields — the allowed dropdown values.
  options: jsonb('options').notNull().default([]).$type<string[]>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
