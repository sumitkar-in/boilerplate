import { BadRequestException } from '@nestjs/common';
import { jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import {
  buildListConditions,
  buildListOrderBy,
  type ListQueryConfig,
} from './list-query.builder';

const thing = pgTable('things', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 255 }),
  customFields: jsonb('custom_fields').$type<Record<string, string>>(),
  createdAt: timestamp('created_at'),
});

const config: ListQueryConfig = {
  fields: { name: thing.name, createdAt: thing.createdAt },
  searchFields: ['name'],
  customFieldsColumn: thing.customFields,
  defaultSort: { field: 'createdAt', direction: 'desc' },
};

describe('buildListConditions', () => {
  it('returns no conditions for an empty query', () => {
    expect(buildListConditions({}, config)).toEqual([]);
  });

  it('builds a search condition across the configured search fields', () => {
    const conditions = buildListConditions({ search: 'ada' }, config);
    expect(conditions).toHaveLength(1);
  });

  it('builds conditions for configured and custom fields', () => {
    const conditions = buildListConditions(
      {
        filters: [
          { field: 'name', operator: 'contains', value: 'ada' },
          { field: 'custom:location', operator: 'equals', value: 'Berlin' },
        ],
      },
      config,
    );
    expect(conditions).toHaveLength(2);
  });

  it('ignores incomplete filters that need a value but have none', () => {
    const conditions = buildListConditions(
      { filters: [{ field: 'name', operator: 'contains', value: '  ' }] },
      config,
    );
    expect(conditions).toEqual([]);
  });

  it('keeps blank/notBlank filters, which need no value', () => {
    const conditions = buildListConditions(
      { filters: [{ field: 'name', operator: 'blank' }] },
      config,
    );
    expect(conditions).toHaveLength(1);
  });

  it('rejects unknown filter fields', () => {
    expect(() =>
      buildListConditions(
        { filters: [{ field: 'nope', operator: 'contains', value: 'x' }] },
        config,
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects malformed custom field keys', () => {
    expect(() =>
      buildListConditions(
        {
          filters: [
            { field: 'custom:bad key!', operator: 'contains', value: 'x' },
          ],
        },
        config,
      ),
    ).toThrow(BadRequestException);
  });
});

describe('buildListOrderBy', () => {
  it('falls back to the configured default sort', () => {
    expect(buildListOrderBy({}, config)).toBeDefined();
  });

  it('sorts by custom fields as text', () => {
    expect(
      buildListOrderBy({ sortBy: 'custom:location', sortDir: 'asc' }, config),
    ).toBeDefined();
  });

  it('rejects unknown sort fields', () => {
    expect(() => buildListOrderBy({ sortBy: 'nope' }, config)).toThrow(
      BadRequestException,
    );
  });
});
