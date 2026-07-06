import { index, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { bpqlTable } from './bpql-table';

export type BpqlRowData = Record<string, string | number | boolean | null>;

export const bpqlRow = pgTable(
  'bpql_rows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tableId: uuid('table_id')
      .notNull()
      .references(() => bpqlTable.id, { onDelete: 'cascade' }),
    data: jsonb('data').notNull().default({}).$type<BpqlRowData>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('bpql_rows_table_id_idx').on(table.tableId),
    index('bpql_rows_created_at_idx').on(table.createdAt.desc()),
  ],
);
