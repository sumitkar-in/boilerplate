import { NotFoundException } from '@nestjs/common';
import { assertFound, DEFAULT_LIST_LIMIT, listAndCount } from './crud.helpers';
import type { ListQueryConfig } from '../query/list-query.builder';
import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

const thing = pgTable('things', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
});

const listConfig: ListQueryConfig = {
  fields: { name: thing.name },
  searchFields: ['name'],
  defaultSort: { field: 'name', direction: 'asc' },
};

/**
 * Chainable stub standing in for drizzle's query builder: first select()
 * resolves rows, second resolves the count row — mirroring listAndCount's
 * two queries.
 */
function fakeDb(rows: unknown[], total: number): NodePgDatabase {
  let call = 0;
  const rowsResult = Promise.resolve(rows);
  const countResult = Promise.resolve([{ total }]);
  const chain = () => {
    call += 1;
    const result = call === 1 ? rowsResult : countResult;
    const builder: Record<string, unknown> = {};
    for (const method of ['from', 'where', 'orderBy', 'limit', 'offset']) {
      builder[method] = () => builder;
    }
    builder.then = result.then.bind(result);
    builder.catch = result.catch.bind(result);
    return builder;
  };
  return { select: chain } as unknown as NodePgDatabase;
}

describe('listAndCount', () => {
  it('returns rows with total and applied pagination', async () => {
    const db = fakeDb([{ id: '1', name: 'a' }], 7);
    const result = await listAndCount(
      db,
      thing,
      { limit: 5, offset: 10 },
      listConfig,
    );
    expect(result).toEqual({
      rows: [{ id: '1', name: 'a' }],
      total: 7,
      limit: 5,
      offset: 10,
    });
  });

  it('falls back to the default limit and zero offset', async () => {
    const db = fakeDb([], 0);
    const result = await listAndCount(db, thing, {}, listConfig);
    expect(result.limit).toBe(DEFAULT_LIST_LIMIT);
    expect(result.offset).toBe(0);
  });
});

describe('assertFound', () => {
  it('returns the row when present', () => {
    expect(assertFound({ id: '1' }, 'Thing')).toEqual({ id: '1' });
  });

  it('throws entity-named 404 for undefined and null', () => {
    expect(() => assertFound(undefined, 'Thing')).toThrow(NotFoundException);
    expect(() => assertFound(null, 'Thing')).toThrow('Thing not found');
  });
});
