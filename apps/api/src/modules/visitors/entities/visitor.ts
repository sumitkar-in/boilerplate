import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const visitor = pgTable('visitors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  phone: varchar('phone', { length: 32 }).notNull(),
  entryTime: timestamp('entry_time', { withTimezone: true }).notNull(),
  exitTime: timestamp('exit_time', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
