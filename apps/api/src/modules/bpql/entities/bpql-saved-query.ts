import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { bpqlTable } from './bpql-table';
import type { BpqlWhereClause } from './bpql-query-types';

/**
 * A named, reusable "view" over a BPQL table — search/filter/sort/column
 * selection saved once so it can be reused across the BPQL page and
 * chart definitions (bpql_charts.saved_query_id) instead of every
 * consumer re-specifying the same filters.
 */
export const bpqlSavedQuery = pgTable(
  'bpql_saved_queries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tableId: uuid('table_id')
      .notNull()
      .references(() => bpqlTable.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description').notNull().default(''),
    search: text('search'),
    where: jsonb('where').notNull().default([]).$type<BpqlWhereClause[]>(),
    sortBy: varchar('sort_by', { length: 64 }),
    sortDir: varchar('sort_dir', { length: 4 }).$type<'asc' | 'desc'>(),
    // Nullable = show every field; a subset of the table's field keys otherwise.
    columns: jsonb('columns').$type<string[] | null>(),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('bpql_saved_queries_table_id_idx').on(table.tableId)],
);
