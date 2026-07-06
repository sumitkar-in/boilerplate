import { useMemo, useState } from 'react';
import { encodeListFilters, toListFilters } from '../api/list-query';
import type {
  AdvancedTableDynamicFilter,
  AdvancedTableFilter,
  AdvancedTableSort,
} from '../components/AdvancedDataTable';

export type ServerTableQuery = {
  search?: string;
  filters?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  limit: number;
  offset: number;
};

export interface UseServerTableResult {
  search: string;
  setSearch: (value: string) => void;
  columnFilters: Record<string, AdvancedTableFilter>;
  onColumnFilterChange: (columnKey: string, filter: AdvancedTableFilter) => void;
  dynamicFilters: AdvancedTableDynamicFilter[];
  onDynamicFiltersChange: (filters: AdvancedTableDynamicFilter[]) => void;
  sort: AdvancedTableSort | null;
  onSortChange: (sort: AdvancedTableSort | null) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  /** Query params to feed straight into the module's list API call. */
  query: ServerTableQuery;
}

/**
 * Shared state + query-param derivation for server-driven AdvancedDataTable
 * pages: search, per-column filters, dynamic filters, sort, and pagination
 * all live here, and every setter resets to page 0. Spread `query` into the
 * module's list API call, and pass the rest straight through to
 * AdvancedDataTable's controlled props — every table page should be wired
 * this same way (see skills/page-view-table-list/SKILL.md).
 */
export function useServerTable(initialPageSize = 50): UseServerTableResult {
  const [search, setSearchValue] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, AdvancedTableFilter>>({});
  const [dynamicFilters, setDynamicFilters] = useState<AdvancedTableDynamicFilter[]>([]);
  const [sort, setSort] = useState<AdvancedTableSort | null>(null);
  const [page, setPageValue] = useState(0);
  const [pageSize, setPageSizeValue] = useState(initialPageSize);

  function setSearch(value: string) {
    setSearchValue(value);
    setPageValue(0);
  }

  function onColumnFilterChange(columnKey: string, filter: AdvancedTableFilter) {
    setColumnFilters((current) => ({ ...current, [columnKey]: filter }));
    setPageValue(0);
  }

  function onDynamicFiltersChange(filters: AdvancedTableDynamicFilter[]) {
    setDynamicFilters(filters);
    setPageValue(0);
  }

  function onSortChange(next: AdvancedTableSort | null) {
    setSort(next);
    setPageValue(0);
  }

  function setPageSize(size: number) {
    setPageSizeValue(size);
    setPageValue(0);
  }

  const listFilters = useMemo(
    () => toListFilters(columnFilters, dynamicFilters),
    [columnFilters, dynamicFilters],
  );

  const query = useMemo<ServerTableQuery>(
    () => ({
      search: search.trim() || undefined,
      filters: encodeListFilters(listFilters),
      sortBy: sort?.key,
      sortDir: sort?.direction,
      limit: pageSize,
      offset: page * pageSize,
    }),
    [search, listFilters, sort, page, pageSize],
  );

  return {
    search,
    setSearch,
    columnFilters,
    onColumnFilterChange,
    dynamicFilters,
    onDynamicFiltersChange,
    sort,
    onSortChange,
    page,
    setPage: setPageValue,
    pageSize,
    setPageSize,
    query,
  };
}
