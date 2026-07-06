import { NotFoundException } from '@nestjs/common';
import { and, sql, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgTable } from 'drizzle-orm/pg-core';
import {
  buildListConditions,
  buildListOrderBy,
  type ListQueryConfig,
} from '../query/list-query.builder';
import type { ListQueryDto } from '../query/list-query.dto';

export const DEFAULT_LIST_LIMIT = 50;

export type ListResult<TRow> = {
  rows: TRow[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * The standard list endpoint: search/filter/sort from ListQueryDto plus
 * pagination, returning rows alongside the un-paginated total. Callers
 * with module-specific conditions (e.g. departmentId) pass them via
 * `extraConditions`. This is the shared half of every module's findAll —
 * anything beyond it belongs in the module service.
 */
export async function listAndCount<TTable extends PgTable>(
  db: NodePgDatabase,
  table: TTable,
  query: ListQueryDto,
  config: ListQueryConfig,
  extraConditions: SQL[] = [],
): Promise<ListResult<TTable['$inferSelect']>> {
  const conditions = [
    ...buildListConditions(query, config),
    ...extraConditions,
  ];
  const where = conditions.length ? and(...conditions) : undefined;
  const orderBy = buildListOrderBy(query, config);
  const limit = query.limit ?? DEFAULT_LIST_LIMIT;
  const offset = query.offset ?? 0;

  const rows = await db
    .select()
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- needed for drizzle orm type compatibility
    .from(table as PgTable)
    .where(where)
    .orderBy(orderBy!)
    .limit(limit)
    .offset(offset);
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- needed for drizzle orm type compatibility
    .from(table as PgTable)
    .where(where);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- needed for drizzle orm type compatibility
  return { rows: rows as TTable['$inferSelect'][], total, limit, offset };
}

/**
 * Narrows a maybe-row (first element of a drizzle result) to a row,
 * throwing the standard 404 otherwise: `assertFound(row, 'Note')` →
 * "Note not found".
 */
export function assertFound<T>(
  row: T | undefined | null,
  entityName: string,
): T {
  if (row == null) throw new NotFoundException(`${entityName} not found`);
  return row;
}
