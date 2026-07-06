import { LIST_FILTER_IN_SEPARATOR } from '@boilerplate/contracts';
import {
  getEmptyFilter,
  isDynamicFilterActive,
  isFilterConditionActive,
  type AdvancedTableDynamicFilter,
  type AdvancedTableFilter,
} from '../components/AdvancedDataTable';

/**
 * Backend filter shape (mirrors apps/api's ListFilterDto) — a field/operator/
 * value triple sent as a JSON-encoded array in the `filters` query param.
 */
export type ListFilter = {
  field: string;
  operator:
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'equals'
    | 'notEquals'
    | 'notContains'
    | 'blank'
    | 'notBlank'
    | 'in';
  value?: string;
};

/**
 * Converts AdvancedDataTable's controlled filter state (per-column filters +
 * dynamic "+ Filter" rows) into the backend's `ListFilter[]` shape. Use this
 * in every module's server-driven table page so filters are wired to the
 * API the same way everywhere — see skills/page-view-table-list/SKILL.md.
 */
export function toListFilters(
  columnFilters: Record<string, AdvancedTableFilter>,
  dynamicFilters: AdvancedTableDynamicFilter[] = [],
): ListFilter[] {
  const filters: ListFilter[] = [];

  for (const [field, filter] of Object.entries(columnFilters)) {
    if (filter.selected.length > 0) {
      filters.push({ field, operator: 'in', value: filter.selected.join(LIST_FILTER_IN_SEPARATOR) });
    }
    if (isFilterConditionActive(filter)) {
      filters.push({ field, operator: filter.operator, value: filter.query });
    }
  }

  for (const filter of dynamicFilters) {
    if (isDynamicFilterActive(filter)) {
      filters.push({ field: filter.columnKey, operator: filter.operator, value: filter.query });
    }
  }

  return filters;
}

/** JSON-encodes filters for the `filters` query param, or undefined when empty (so buildQueryString drops it). */
export function encodeListFilters(filters: ListFilter[]): string | undefined {
  return filters.length > 0 ? JSON.stringify(filters) : undefined;
}

export { getEmptyFilter };
