import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { employee } from './employee';

export const employeeManagerHistory = pgTable('employee_manager_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employee.id, { onDelete: 'cascade' }),
  oldManagerId: uuid('old_manager_id'),
  newManagerId: uuid('new_manager_id'),
  changedAt: timestamp('changed_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
