import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Filter,
  FilterX,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { Button } from './Button';

export type AdvancedTableSortDirection = 'asc' | 'desc';

export type AdvancedTableFilterOperator =
  | 'contains'
  | 'startsWith'
  | 'equals'
  | 'endsWith'
  | 'notContains'
  | 'notEquals'
  | 'blank'
  | 'notBlank';

export type AdvancedTableFilter = {
  search: string;
  selected: string[];
  operator: AdvancedTableFilterOperator;
  query: string;
};

export type AdvancedTableDynamicFilter = {
  id: string;
  columnKey: string;
  operator: AdvancedTableFilterOperator;
  query: string;
};

export type AdvancedTableEditType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'date'
  | 'textarea'
  | 'select';

export interface AdvancedTableColumn<T> {
  key: string;
  title: string;
  render?: (row: T) => React.ReactNode;
  getValue?: (row: T) => string;
  // Raw value used when editing, when it differs from the display value
  // (e.g. a select column shows a label but edits an id).
  getEditValue?: (row: T) => string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  editable?: boolean;
  editType?: AdvancedTableEditType;
  // Options for editType 'select'.
  editOptions?: Array<{ label: string; value: string }>;
  filterable?: boolean;
  sortable?: boolean;
  isAction?: boolean;
}

export interface AdvancedDataTableProps<T> {
  data: T[];
  columns: AdvancedTableColumn<T>[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  enableToolbar?: boolean;
  toolbarActions?: React.ReactNode;
  // Global quick search. Uncontrolled by default (filters rows client-side
  // across all non-action columns). Pass searchValue + onSearchChange to
  // take control — e.g. to run the search server-side instead.
  enableGlobalSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  // Per-column filters (the header dropdown menus) and the dynamic
  // "+ Filter" rows. Uncontrolled by default (filters the current `data`
  // page client-side). Pass columnFilters + onColumnFilterChange (and/or
  // dynamicFilters + onDynamicFiltersChange) to take control — the caller
  // owns the filter state and is expected to refetch `data` from the
  // server with it applied, matching the searchValue/onSearchChange
  // pattern above.
  columnFilters?: Record<string, AdvancedTableFilter>;
  onColumnFilterChange?: (columnKey: string, filter: AdvancedTableFilter) => void;
  dynamicFilters?: AdvancedTableDynamicFilter[];
  onDynamicFiltersChange?: (filters: AdvancedTableDynamicFilter[]) => void;
  // Distinct values offered in a column's filter menu. Required when that
  // column's filtering is server-driven (controlled), since the table can
  // no longer enumerate values from `data` — it only holds one page.
  filterValueOptions?: Record<string, string[]>;
  // Column sort (the header "Sort A to Z / Z to A" menu items).
  // Uncontrolled by default (sorts the current `data` page client-side).
  // Pass sort + onSortChange to take control — e.g. to sort server-side.
  sort?: AdvancedTableSort | null;
  onSortChange?: (sort: AdvancedTableSort | null) => void;
  // When set, shows an "Export CSV" button that downloads the currently
  // filtered rows under this file name.
  exportFileName?: string;
  // Server-side pagination footer. `data` is expected to hold one page;
  // the caller refetches on page/pageSize changes.
  pagination?: AdvancedTablePagination;
  onCellEdit?: (row: T, column: AdvancedTableColumn<T>, value: string) => void | Promise<void>;
}

export type AdvancedTableSort = { key: string; direction: AdvancedTableSortDirection };

export type AdvancedTablePagination = {
  page: number; // zero-based
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function AdvancedDataTable<T>({
  data,
  columns,
  rowKey,
  isLoading = false,
  loadingMessage = 'Loading records...',
  emptyMessage = 'No records found',
  enableToolbar = true,
  toolbarActions,
  enableGlobalSearch = true,
  searchPlaceholder = 'Search records',
  searchValue,
  onSearchChange,
  columnFilters,
  onColumnFilterChange,
  dynamicFilters: dynamicFiltersProp,
  onDynamicFiltersChange,
  filterValueOptions,
  sort: sortProp,
  onSortChange,
  exportFileName,
  pagination,
  onCellEdit,
}: AdvancedDataTableProps<T>): React.ReactElement {
  const [internalFilters, setInternalFilters] = useState<Record<string, AdvancedTableFilter>>({});
  const [internalDynamicFilters, setInternalDynamicFilters] = useState<AdvancedTableDynamicFilter[]>([]);
  const [internalSort, setInternalSort] = useState<AdvancedTableSort | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [internalSearch, setInternalSearch] = useState('');
  const isSearchControlled = onSearchChange !== undefined;
  const globalSearch = isSearchControlled ? (searchValue ?? '') : internalSearch;
  const isFilterControlled = onColumnFilterChange !== undefined;
  const isDynamicFilterControlled = onDynamicFiltersChange !== undefined;
  const isSortControlled = onSortChange !== undefined;
  const filters = isFilterControlled ? (columnFilters ?? {}) : internalFilters;
  const dynamicFilters = isDynamicFilterControlled ? (dynamicFiltersProp ?? []) : internalDynamicFilters;
  const sort = isSortControlled ? (sortProp ?? null) : internalSort;

  const getCellValue = useCallback((row: T, column: AdvancedTableColumn<T>) => {
    if (column.getValue) return column.getValue(row);
    const value = (row as Record<string, unknown>)[column.key];
    return value == null ? '' : String(value);
  }, []);

  const filterableColumns = useMemo(
    () => columns.filter((column) => !column.isAction && column.filterable !== false),
    [columns],
  );
  const activeColumnFilterCount = Object.values(filters).filter(isFilterActive).length;
  const activeDynamicFilterCount = dynamicFilters.filter(isDynamicFilterActive).length;
  const activeFilterCount = activeColumnFilterCount + activeDynamicFilterCount;
  const filteredRows = useMemo(() => {
    // Controlled search is the caller's job (usually server-side); only
    // apply the quick search client-side when uncontrolled.
    const searchTerm = isSearchControlled ? '' : globalSearch.trim().toLowerCase();
    const searchedRows = searchTerm
      ? data.filter((row) =>
          columns.some(
            (column) => !column.isAction && getCellValue(row, column).toLowerCase().includes(searchTerm),
          ),
        )
      : data;

    // Controlled filters/sort are the caller's job (usually server-side);
    // only re-derive them client-side when uncontrolled, since `data` is
    // already filtered/sorted server-side in the controlled case.
    const activeFilters = isFilterControlled
      ? []
      : Object.entries(filters).filter(([, filter]) => isFilterActive(filter));
    const columnFilteredRows = activeFilters.reduce((currentRows, [columnKey, filter]) => {
      const column = columns.find((entry) => entry.key === columnKey);
      if (!column) return currentRows;
      const selected = new Set(filter.selected);
      return currentRows.filter((row) => {
        const value = getCellValue(row, column);
        const valueMatch = selected.size === 0 || selected.has(value || '(blank)');
        const conditionMatch = matchesFilterCondition(value, filter);
        return valueMatch && conditionMatch;
      });
    }, searchedRows);

    const activeDynamicFilters = isDynamicFilterControlled ? [] : dynamicFilters.filter(isDynamicFilterActive);
    const nextRows = activeDynamicFilters.reduce((currentRows, filter) => {
      const column = columns.find((entry) => entry.key === filter.columnKey);
      if (!column) return currentRows;

      return currentRows.filter((row) =>
        matchesFilterCondition(getCellValue(row, column), {
          search: '',
          selected: [],
          operator: filter.operator,
          query: filter.query,
        }),
      );
    }, columnFilteredRows);

    if (isSortControlled || !sort) return nextRows;
    const sortColumn = columns.find((column) => column.key === sort.key);
    if (!sortColumn) return nextRows;

    return [...nextRows].sort((a, b) => {
      const left = getCellValue(a, sortColumn).toLowerCase();
      const right = getCellValue(b, sortColumn).toLowerCase();
      const result = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
      return sort.direction === 'asc' ? result : -result;
    });
  }, [
    columns,
    data,
    dynamicFilters,
    filters,
    getCellValue,
    globalSearch,
    isDynamicFilterControlled,
    isFilterControlled,
    isSearchControlled,
    isSortControlled,
    sort,
  ]);

  function getUniqueValues(column: AdvancedTableColumn<T>) {
    if (isFilterControlled) return filterValueOptions?.[column.key] ?? [];
    const values = new Set<string>();
    data.forEach((row) => values.add(getCellValue(row, column) || '(blank)'));
    return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }

  function updateFilter(columnKey: string, patch: Partial<AdvancedTableFilter>) {
    const current = filters[columnKey] ?? getEmptyFilter();
    const nextFilter = { ...current, ...patch };
    if (isFilterControlled) onColumnFilterChange?.(columnKey, nextFilter);
    else setInternalFilters((prev) => ({ ...prev, [columnKey]: nextFilter }));
  }

  function toggleFilterValue(columnKey: string, value: string) {
    const filter = filters[columnKey] ?? getEmptyFilter();
    const selected = new Set(filter.selected);
    if (selected.has(value)) selected.delete(value);
    else selected.add(value);
    updateFilter(columnKey, { selected: Array.from(selected) });
  }

  function clearColumnFilter(columnKey: string) {
    if (isFilterControlled) onColumnFilterChange?.(columnKey, getEmptyFilter());
    else setInternalFilters((current) => {
      const next = { ...current };
      delete next[columnKey];
      return next;
    });
    if (sort?.key === columnKey) setSortValue(null);
  }

  function setSortValue(next: AdvancedTableSort | null) {
    if (isSortControlled) onSortChange?.(next);
    else setInternalSort(next);
  }

  function setDynamicFiltersValue(next: AdvancedTableDynamicFilter[]) {
    if (isDynamicFilterControlled) onDynamicFiltersChange?.(next);
    else setInternalDynamicFilters(next);
  }

  function addDynamicFilter() {
    const firstColumn = filterableColumns[0];
    if (!firstColumn) return;

    setDynamicFiltersValue([
      ...dynamicFilters,
      {
        id: `${firstColumn.key}:${Date.now()}:${dynamicFilters.length}`,
        columnKey: firstColumn.key,
        operator: 'contains',
        query: '',
      },
    ]);
  }

  function updateDynamicFilter(id: string, patch: Partial<Omit<AdvancedTableDynamicFilter, 'id'>>) {
    setDynamicFiltersValue(
      dynamicFilters.map((filter) => (filter.id === id ? { ...filter, ...patch } : filter)),
    );
  }

  function removeDynamicFilter(id: string) {
    setDynamicFiltersValue(dynamicFilters.filter((filter) => filter.id !== id));
  }

  function clearAllFilters() {
    if (isFilterControlled) Object.keys(filters).forEach((columnKey) => onColumnFilterChange?.(columnKey, getEmptyFilter()));
    else setInternalFilters({});
    setDynamicFiltersValue([]);
  }

  function handleSearchChange(value: string) {
    if (isSearchControlled) onSearchChange?.(value);
    else setInternalSearch(value);
  }

  function exportCsv() {
    const exportColumns = columns.filter((column) => !column.isAction);
    const lines = [
      exportColumns.map((column) => escapeCsvCell(column.title)).join(','),
      ...filteredRows.map((row) =>
        exportColumns.map((column) => escapeCsvCell(getCellValue(row, column))).join(','),
      ),
    ];
    // BOM so Excel opens the file as UTF-8.
    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFileName!.endsWith('.csv') ? exportFileName! : `${exportFileName!}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {enableToolbar && (
        <div className="advanced-table-toolbar">
          <div className="advanced-table-toolbar__summary">
            {enableGlobalSearch && (
              <label className="advanced-table-toolbar__search">
                <Search size={14} />
                <input
                  value={globalSearch}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                />
              </label>
            )}
            {activeFilterCount > 0 && (
              <span className="advanced-table-toolbar__filter-status">
                <Filter size={14} />
                {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <div className="advanced-table-toolbar__actions">
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <FilterX size={14} />
                Clear
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={addDynamicFilter} disabled={filterableColumns.length === 0}>
              <Plus size={14} />
              Filter
            </Button>
            {exportFileName && (
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={filteredRows.length === 0}>
                <Download size={14} />
                Export CSV
              </Button>
            )}
            {toolbarActions}
          </div>
        </div>
      )}

      {enableToolbar && dynamicFilters.length > 0 && (
        <div className="advanced-table-dynamic-filters" aria-label="Dynamic filters">
          {dynamicFilters.map((filter) => {
            const selectedColumn = columns.find((column) => column.key === filter.columnKey);
            const conditionNeedsInput = !['blank', 'notBlank'].includes(filter.operator);

            return (
              <div className="advanced-table-dynamic-filter" key={filter.id}>
                <select
                  value={filter.columnKey}
                  aria-label="Filter column"
                  onChange={(event) =>
                    updateDynamicFilter(filter.id, {
                      columnKey: event.target.value,
                      operator: 'contains',
                      query: '',
                    })
                  }
                >
                  {filterableColumns.map((column) => (
                    <option key={column.key} value={column.key}>
                      {column.title}
                    </option>
                  ))}
                </select>

                <select
                  value={filter.operator}
                  aria-label={`${selectedColumn?.title ?? 'Column'} filter operator`}
                  onChange={(event) =>
                    updateDynamicFilter(filter.id, {
                      operator: event.target.value as AdvancedTableFilterOperator,
                      query: ['blank', 'notBlank'].includes(event.target.value) ? '' : filter.query,
                    })
                  }
                >
                  {filterOperatorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {conditionNeedsInput ? (
                  <input
                    value={filter.query}
                    placeholder="Value"
                    aria-label={`${selectedColumn?.title ?? 'Column'} filter value`}
                    onChange={(event) => updateDynamicFilter(filter.id, { query: event.target.value })}
                  />
                ) : (
                  <span className="advanced-table-dynamic-filter__blank">No value needed</span>
                )}

                <button type="button" onClick={() => removeDynamicFilter(filter.id)} aria-label="Remove filter">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="advanced-table-wrap">
        <table className="advanced-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} style={{ width: column.width, textAlign: column.align || 'left' }}>
                  {column.isAction ? null : (
                    <ColumnFilterButton
                      column={column}
                      values={getUniqueValues(column)}
                      filter={filters[column.key] ?? getEmptyFilter()}
                      sortDirection={sort?.key === column.key ? sort.direction : null}
                      isOpen={openMenu === column.key}
                      onOpen={() => setOpenMenu(openMenu === column.key ? null : column.key)}
                      onClose={() => setOpenMenu(null)}
                      onSort={(direction) => {
                        setSortValue({ key: column.key, direction });
                        setOpenMenu(null);
                      }}
                      onSearch={(search) => updateFilter(column.key, { search })}
                      onConditionChange={(operator, query) => updateFilter(column.key, { operator, query })}
                      onToggleValue={(value) => toggleFilterValue(column.key, value)}
                      onSelectAll={(values) => updateFilter(column.key, { selected: values })}
                      onClear={() => clearColumnFilter(column.key)}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="advanced-table__state">{loadingMessage}</td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="advanced-table__state">{emptyMessage}</td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((column) => (
                    <td key={column.key} style={{ textAlign: column.align || 'left' }}>
                      {column.editable && onCellEdit ? (
                        <AdvancedEditableCell
                          value={column.getEditValue ? column.getEditValue(row) : getCellValue(row, column)}
                          type={column.editType || 'text'}
                          options={column.editOptions}
                          onSave={(value) => onCellEdit(row, column, value)}
                        >
                          {column.render ? column.render(row) : getCellValue(row, column)}
                        </AdvancedEditableCell>
                      ) : column.render ? (
                        column.render(row)
                      ) : (
                        getCellValue(row, column)
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && <AdvancedTablePaginationBar pagination={pagination} />}
    </>
  );
}

function AdvancedTablePaginationBar({ pagination }: { pagination: AdvancedTablePagination }) {
  const { page, pageSize, total, onPageChange, onPageSizeChange } = pagination;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const sizeOptions = pagination.pageSizeOptions ?? [10, 25, 50, 100];

  return (
    <div className="advanced-table-pagination">
      <span className="advanced-table-pagination__info">
        {from}–{to} of {total}
      </span>
      <div className="advanced-table-pagination__controls">
        <select
          value={pageSize}
          aria-label="Rows per page"
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {sizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
        <button type="button" onClick={() => onPageChange(0)} disabled={page === 0} aria-label="First page">
          <ChevronsLeft size={15} />
        </button>
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page === 0} aria-label="Previous page">
          <ChevronLeft size={15} />
        </button>
        <span className="advanced-table-pagination__page">
          Page {Math.min(page + 1, pageCount)} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount - 1}
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(pageCount - 1)}
          disabled={page >= pageCount - 1}
          aria-label="Last page"
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
}

function ColumnFilterButton<T>({
  column,
  values,
  filter,
  sortDirection,
  isOpen,
  onOpen,
  onClose,
  onSort,
  onSearch,
  onConditionChange,
  onToggleValue,
  onSelectAll,
  onClear,
}: {
  column: AdvancedTableColumn<T>;
  values: string[];
  filter: AdvancedTableFilter;
  sortDirection: AdvancedTableSortDirection | null;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSort: (direction: AdvancedTableSortDirection) => void;
  onSearch: (search: string) => void;
  onConditionChange: (operator: AdvancedTableFilterOperator, query: string) => void;
  onToggleValue: (value: string) => void;
  onSelectAll: (values: string[]) => void;
  onClear: () => void;
}) {
  const search = filter.search.trim().toLowerCase();
  const visibleValues = search ? values.filter((value) => value.toLowerCase().includes(search)) : values;
  const conditionNeedsInput = !['blank', 'notBlank'].includes(filter.operator);
  const conditionActive = isFilterConditionActive(filter);
  const active = filter.selected.length > 0 || conditionActive || sortDirection !== null;
  const canFilter = column.filterable !== false;
  const canSort = column.sortable !== false;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const MENU_WIDTH = 260;
    const MARGIN = 8;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const left = Math.min(rect.left, window.innerWidth - MENU_WIDTH - MARGIN);
      setMenuPosition({ top: rect.bottom + 4, left: Math.max(MARGIN, left) });
    }

    updatePosition();

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onClose, true);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, true);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div className="advanced-table-filter">
      <button
        ref={triggerRef}
        type="button"
        className={`advanced-table-filter__trigger${active ? ' advanced-table-filter__trigger--active' : ''}`}
        onClick={onOpen}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span>{column.title}</span>
        {(canFilter || canSort) && <ChevronDown size={12} />}
      </button>
      {isOpen && (canFilter || canSort) && menuPosition && (
        <div
          ref={menuRef}
          className="advanced-table-filter__menu"
          role="menu"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          {canSort && (
            <div className="advanced-table-filter__sort">
              <button type="button" onClick={() => onSort('asc')}>Sort A to Z</button>
              <button type="button" onClick={() => onSort('desc')}>Sort Z to A</button>
            </div>
          )}
          {canFilter && (
            <>
              <div className="advanced-table-filter__condition">
                <label>
                  <span>Match</span>
                  <select
                    value={filter.operator}
                    onChange={(event) => onConditionChange(event.target.value as AdvancedTableFilterOperator, filter.query)}
                  >
                    {filterOperatorOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {conditionNeedsInput && (
                  <input
                    value={filter.query}
                    onChange={(event) => onConditionChange(filter.operator, event.target.value)}
                    placeholder="Filter text"
                    aria-label="Filter text"
                  />
                )}
                {conditionActive && (
                  <button type="button" onClick={() => onConditionChange('contains', '')}>
                    Clear condition
                  </button>
                )}
              </div>
              <label className="advanced-table-filter__search">
                <Search size={14} />
                <input value={filter.search} onChange={(event) => onSearch(event.target.value)} placeholder="Search values" />
              </label>
              <div className="advanced-table-filter__select-row">
                <button type="button" onClick={() => onSelectAll(visibleValues)}>Select visible</button>
                <button type="button" onClick={onClear}>Clear</button>
              </div>
              <div className="advanced-table-filter__values">
                {visibleValues.length === 0 ? (
                  <div className="advanced-table-filter__empty">No values</div>
                ) : (
                  visibleValues.map((value) => (
                    <label className="advanced-table-checkbox" key={value}>
                      <input
                        type="checkbox"
                        checked={filter.selected.includes(value)}
                        onChange={() => onToggleValue(value)}
                      />
                      <span>{value}</span>
                    </label>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const filterOperatorOptions: Array<{ value: AdvancedTableFilterOperator; label: string }> = [
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'equals', label: 'Equals' },
  { value: 'endsWith', label: 'Ends with' },
  { value: 'notContains', label: 'Does not contain' },
  { value: 'notEquals', label: 'Does not equal' },
  { value: 'blank', label: 'Is blank' },
  { value: 'notBlank', label: 'Is not blank' },
];

// Cells opened in Excel/Sheets are treated as formulas if they start with
// one of these characters — prefixing with a single quote forces them to
// be read as literal text and neutralizes CSV/spreadsheet formula injection.
const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r]/;

function escapeCsvCell(value: string): string {
  const safeValue = FORMULA_PREFIX_PATTERN.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(safeValue)) return `"${safeValue.replace(/"/g, '""')}"`;
  return safeValue;
}

export function isDynamicFilterActive(filter: AdvancedTableDynamicFilter) {
  if (filter.operator === 'blank' || filter.operator === 'notBlank') return true;
  return filter.query.trim().length > 0;
}

export function getEmptyFilter(): AdvancedTableFilter {
  return {
    search: '',
    selected: [],
    operator: 'contains',
    query: '',
  };
}

export function isFilterActive(filter: AdvancedTableFilter) {
  return filter.selected.length > 0 || isFilterConditionActive(filter);
}

export function isFilterConditionActive(filter: AdvancedTableFilter) {
  if (filter.operator === 'blank' || filter.operator === 'notBlank') return true;
  return filter.query.trim().length > 0;
}

function matchesFilterCondition(value: string, filter: AdvancedTableFilter) {
  if (!isFilterConditionActive(filter)) return true;

  const normalizedValue = value.trim().toLowerCase();
  const normalizedQuery = filter.query.trim().toLowerCase();

  switch (filter.operator) {
    case 'contains':
      return normalizedValue.includes(normalizedQuery);
    case 'startsWith':
      return normalizedValue.startsWith(normalizedQuery);
    case 'equals':
      return normalizedValue === normalizedQuery;
    case 'endsWith':
      return normalizedValue.endsWith(normalizedQuery);
    case 'notContains':
      return !normalizedValue.includes(normalizedQuery);
    case 'notEquals':
      return normalizedValue !== normalizedQuery;
    case 'blank':
      return normalizedValue.length === 0;
    case 'notBlank':
      return normalizedValue.length > 0;
    default:
      return true;
  }
}

function AdvancedEditableCell({
  value,
  type,
  options,
  children,
  onSave,
}: {
  value: string;
  type: AdvancedTableEditType;
  options?: Array<{ label: string; value: string }>;
  children: React.ReactNode;
  onSave: (value: string) => void | Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  async function commit(nextValue = draft) {
    if (nextValue.trim() === value.trim()) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(nextValue);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing && type === 'select') {
    return (
      <select
        className="advanced-table__cell-input"
        value={draft}
        disabled={isSaving}
        autoFocus
        onChange={(event) => {
          setDraft(event.target.value);
          void commit(event.target.value);
        }}
        onBlur={() => setIsEditing(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsEditing(false);
        }}
      >
        {(options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (isEditing) {
    const commonProps = {
      className: 'advanced-table__cell-input',
      value: draft,
      disabled: isSaving,
      autoFocus: true,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value),
      onBlur: () => void commit(),
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.key === 'Escape') {
          setDraft(value);
          setIsEditing(false);
        }
        if (event.key === 'Enter' && type !== 'textarea') {
          event.preventDefault();
          void commit();
        }
      },
    };

    return type === 'textarea' ? <textarea {...commonProps} rows={2} /> : <input {...commonProps} type={type} />;
  }

  return (
    <button
      type="button"
      className="advanced-table__editable-cell"
      onClick={() => {
        setDraft(value);
        setIsEditing(true);
      }}
      title="Click to edit"
    >
      {children || <span className="advanced-table__blank">Blank</span>}
    </button>
  );
}
