import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const employee = pgTable(
  'employees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    // Soft reference to the departments module (no FK — see migration 0003).
    departmentId: uuid('department_id'),
    managerId: uuid('manager_id'),
    // Values keyed by employee_custom_fields.field_key.
    customFields: jsonb('custom_fields')
      .notNull()
      .default({})
      .$type<Record<string, string>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('employees_created_at_idx').on(table.createdAt.desc()),
    index('employees_department_id_idx').on(table.departmentId),
  ],
);
