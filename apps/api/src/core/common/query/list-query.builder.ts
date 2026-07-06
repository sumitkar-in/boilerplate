import { BadRequestException } from '@nestjs/common';
import { asc, desc, or, sql, SQL } from 'drizzle-orm';
import type { AnyColumn } from 'drizzle-orm';
import { LIST_FILTER_IN_SEPARATOR } from '@boilerplate/contracts';
import type { ListFilterOperator, ListQueryDto } from './list-query.dto';

export type ListFieldExpression = AnyColumn | SQL;

/**
 * Per-module description of what a list endpoint exposes: which fields can
 * be filtered/sorted, which participate in free-text search, and (optionally)
 * a jsonb column that backs dynamic "custom:<key>" fields. This is the one
 * thing a new module defines to get search/filter/sort/pagination for free.
 */
export type ListQueryConfig = {
  fields: Record<string, ListFieldExpression>;
  searchFields?: string[];
  customFieldsColumn?: AnyColumn;
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
};

const CUSTOM_FIELD_PREFIX = 'custom:';
const CUSTOM_FIELD_KEY = /^[a-z0-9_-]+$/;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/**
 * Resolves a field key to a text SQL expression. Custom fields
 * ("custom:<key>") read from the configured jsonb column; everything else
 * must be declared in `config.fields` — unknown keys are a client error.
 */
function resolveFieldText(config: ListQueryConfig, field: string): SQL {
  if (field.startsWith(CUSTOM_FIELD_PREFIX) && config.customFieldsColumn) {
    const key = field.slice(CUSTOM_FIELD_PREFIX.length);
    if (!CUSTOM_FIELD_KEY.test(key)) {
      throw new BadRequestException(`Invalid custom field key "${key}"`);
    }
    return sql`coalesce(${config.customFieldsColumn} ->> ${key}, '')`;
  }
  const expression = config.fields[field];
  if (!expression) {
    throw new BadRequestException(`Unknown field "${field}"`);
  }
  return sql`coalesce(${expression}::text, '')`;
}

function operatorNeedsValue(operator: ListFilterOperator): boolean {
  return operator !== 'blank' && operator !== 'notBlank';
}

function buildFilterCondition(
  expression: SQL,
  operator: ListFilterOperator,
  value: string,
): SQL {
  const contains = `%${escapeLike(value)}%`;
  switch (operator) {
    case 'contains':
      return sql`${expression} ILIKE ${contains}`;
    case 'notContains':
      return sql`${expression} NOT ILIKE ${contains}`;
    case 'startsWith':
      return sql`${expression} ILIKE ${`${escapeLike(value)}%`}`;
    case 'endsWith':
      return sql`${expression} ILIKE ${`%${escapeLike(value)}`}`;
    case 'equals':
      return sql`lower(${expression}) = lower(${value})`;
    case 'notEquals':
      return sql`lower(${expression}) <> lower(${value})`;
    case 'blank':
      return sql`${expression} = ''`;
    case 'notBlank':
      return sql`${expression} <> ''`;
    case 'in': {
      const values = value
        .split(LIST_FILTER_IN_SEPARATOR)
        .filter(Boolean)
        .map((entry) => entry.toLowerCase());
      return sql`lower(${expression}) = ANY(${values})`;
    }
  }
}

/**
 * Turns a validated ListQueryDto into drizzle WHERE conditions. The caller
 * may push extra module-specific conditions (e.g. departmentId) before
 * combining with and(...).
 */
export function buildListConditions(
  query: ListQueryDto,
  config: ListQueryConfig,
): SQL[] {
  const conditions: SQL[] = [];

  const search = query.search?.trim();
  if (search && config.searchFields?.length) {
    const term = `%${escapeLike(search)}%`;
    const matches = config.searchFields.map(
      (field) => sql`${resolveFieldText(config, field)} ILIKE ${term}`,
    );
    conditions.push(or(...matches)!);
  }

  for (const filter of query.filters ?? []) {
    const value = filter.value?.trim() ?? '';
    // An operator that needs a value but has none is an incomplete filter
    // row, not an error — the UI sends these while the user is still typing.
    if (operatorNeedsValue(filter.operator) && !value) continue;
    const expression = resolveFieldText(config, filter.field);
    conditions.push(buildFilterCondition(expression, filter.operator, value));
  }

  return conditions;
}

/** Resolves sortBy/sortDir (falling back to the config default) to an ORDER BY term. */
export function buildListOrderBy(
  query: ListQueryDto,
  config: ListQueryConfig,
): SQL | undefined {
  const field = query.sortBy ?? config.defaultSort?.field;
  if (!field) return undefined;
  const direction = query.sortDir ?? config.defaultSort?.direction ?? 'asc';

  // Sort on the raw column (not its text cast) so numbers and dates order
  // naturally; custom fields only exist as text, so they sort as text.
  let expression: ListFieldExpression | SQL;
  if (field.startsWith(CUSTOM_FIELD_PREFIX) && config.customFieldsColumn) {
    expression = resolveFieldText(config, field);
  } else {
    const configured = config.fields[field];
    if (!configured)
      throw new BadRequestException(`Unknown sort field "${field}"`);
    expression = configured;
  }
  return direction === 'desc' ? desc(expression) : asc(expression);
}
