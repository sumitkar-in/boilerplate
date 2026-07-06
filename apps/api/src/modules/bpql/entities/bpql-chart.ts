import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { bpqlSavedQuery } from './bpql-saved-query';
import { bpqlTable } from './bpql-table';
import type { BpqlWhereClause } from './bpql-query-types';

export type { BpqlWhereClause } from './bpql-query-types';

export const BPQL_CHART_TYPES = [
  'bar',
  'line',
  'area',
  'pie',
  'number',
  'table',
] as const;
export type BpqlChartType = (typeof BPQL_CHART_TYPES)[number];

export const BPQL_AGG_FUNCTIONS = [
  'count',
  'sum',
  'avg',
  'min',
  'max',
] as const;
export type BpqlAggFunction = (typeof BPQL_AGG_FUNCTIONS)[number];

export const BPQL_CHART_PLACEMENTS = ['bpql', 'dashboard'] as const;
export type BpqlChartPlacement = (typeof BPQL_CHART_PLACEMENTS)[number];

/**
 * A saved chart/card definition: a table + optional saved-query filters
 * (savedQueryId, resolved at data-fetch time so edits to the saved query
 * cascade automatically) or its own embedded filters, plus the
 * aggregation shape (group-by/metric/agg function) and how it's
 * rendered. `placement: 'dashboard'` pins it to the main app dashboard
 * (apps/web/src/core/pages/DashboardPage.tsx); 'bpql' keeps it on the
 * BPQL module's own Charts tab only.
 */
export const bpqlChart = pgTable(
  'bpql_charts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tableId: uuid('table_id')
      .notNull()
      .references(() => bpqlTable.id, { onDelete: 'cascade' }),
    savedQueryId: uuid('saved_query_id').references(() => bpqlSavedQuery.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description').notNull().default(''),
    chartType: varchar('chart_type', { length: 16 })
      .notNull()
      .$type<BpqlChartType>(),
    // Field to group rows by (x-axis / pie slice / table rows). Null for
    // a single 'number' KPI card that aggregates the whole filtered set.
    groupByField: varchar('group_by_field', { length: 64 }),
    // Field the aggregation function runs over. Not needed when
    // aggFunction is 'count'.
    metricField: varchar('metric_field', { length: 64 }),
    aggFunction: varchar('agg_function', { length: 16 })
      .notNull()
      .default('count')
      .$type<BpqlAggFunction>(),
    // Embedded filters, used when savedQueryId is null (or as a base
    // that savedQueryId's filters take precedence over when set).
    search: text('search'),
    where: jsonb('where').notNull().default([]).$type<BpqlWhereClause[]>(),
    groupLimit: integer('group_limit').notNull().default(10),
    placement: varchar('placement', { length: 16 })
      .notNull()
      .default('bpql')
      .$type<BpqlChartPlacement>(),
    order: integer('order').notNull().default(0),
    color: varchar('color', { length: 32 }),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('bpql_charts_table_id_idx').on(table.tableId),
    index('bpql_charts_placement_idx').on(table.placement, table.order),
  ],
);
