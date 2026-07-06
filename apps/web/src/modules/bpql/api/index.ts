import { buildQueryString } from '@boilerplate/ui-common';
import { apiFetch } from '../../../core/api-client';

export type BpqlFieldType = 'text' | 'number' | 'boolean' | 'date' | 'select';

export type BpqlFieldDefinition = {
  key: string;
  label: string;
  type: BpqlFieldType;
  required?: boolean;
  options?: string[];
};

export type BpqlTable = {
  id: string;
  name: string;
  slug: string;
  description: string;
  fields: BpqlFieldDefinition[];
  createdAt: string;
  updatedAt: string;
};

export type BpqlRowData = Record<string, string | number | boolean | null>;

export type BpqlRow = {
  id: string;
  tableId: string;
  data: BpqlRowData;
  createdAt: string;
  updatedAt: string;
};

export type BpqlListResult<T> = {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
};

export type BpqlTableInput = {
  name: string;
  slug: string;
  description?: string;
  fields: BpqlFieldDefinition[];
};

export type BpqlRowQuery = {
  search?: string;
  limit?: number;
  offset?: number;
};

export function listBpqlTables(): Promise<BpqlTable[]> {
  return apiFetch<BpqlTable[]>('/bpql/tables');
}

export function createBpqlTable(input: BpqlTableInput): Promise<BpqlTable> {
  return apiFetch<BpqlTable>('/bpql/tables', { method: 'POST', body: input });
}

export function updateBpqlTable(slug: string, input: Partial<BpqlTableInput>): Promise<BpqlTable> {
  return apiFetch<BpqlTable>(`/bpql/tables/${slug}`, { method: 'PATCH', body: input });
}

export function deleteBpqlTable(slug: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/bpql/tables/${slug}`, { method: 'DELETE' });
}

export function listBpqlRows(
  slug: string,
  params: BpqlRowQuery = {},
): Promise<BpqlListResult<BpqlRow>> {
  return apiFetch<BpqlListResult<BpqlRow>>(`/bpql/tables/${slug}/rows${buildQueryString(params)}`);
}

export function createBpqlRow(slug: string, data: BpqlRowData): Promise<BpqlRow> {
  return apiFetch<BpqlRow>(`/bpql/tables/${slug}/rows`, { method: 'POST', body: { data } });
}

export function updateBpqlRow(slug: string, rowId: string, data: BpqlRowData): Promise<BpqlRow> {
  return apiFetch<BpqlRow>(`/bpql/tables/${slug}/rows/${rowId}`, {
    method: 'PATCH',
    body: { data },
  });
}

export function deleteBpqlRow(slug: string, rowId: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/bpql/tables/${slug}/rows/${rowId}`, { method: 'DELETE' });
}

// --- BPQL where-clause / saved queries / charts (BI layer) ---

export type BpqlOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'blank'
  | 'notBlank'
  | 'greaterThan'
  | 'greaterOrEqual'
  | 'lessThan'
  | 'lessOrEqual';

export type BpqlWhereClause = {
  field: string;
  operator: BpqlOperator;
  value?: string;
};

export type BpqlSavedQuery = {
  id: string;
  tableId: string;
  name: string;
  description: string;
  search: string | null;
  where: BpqlWhereClause[];
  sortBy: string | null;
  sortDir: 'asc' | 'desc' | null;
  columns: string[] | null;
  createdAt: string;
  updatedAt: string;
};

export type BpqlSavedQueryInput = {
  table: string;
  name: string;
  description?: string;
  search?: string;
  where?: BpqlWhereClause[];
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  columns?: string[];
};

export type BpqlChartType = 'bar' | 'line' | 'area' | 'pie' | 'number' | 'table';
export type BpqlAggFunction = 'count' | 'sum' | 'avg' | 'min' | 'max';
export type BpqlChartPlacement = 'bpql' | 'dashboard';

export type BpqlChart = {
  id: string;
  tableId: string;
  savedQueryId: string | null;
  name: string;
  description: string;
  chartType: BpqlChartType;
  groupByField: string | null;
  metricField: string | null;
  aggFunction: BpqlAggFunction;
  search: string | null;
  where: BpqlWhereClause[];
  groupLimit: number;
  placement: BpqlChartPlacement;
  order: number;
  color: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BpqlChartInput = {
  table: string;
  savedQueryId?: string;
  name: string;
  description?: string;
  chartType: BpqlChartType;
  groupByField?: string;
  metricField?: string;
  aggFunction: BpqlAggFunction;
  search?: string;
  where?: BpqlWhereClause[];
  groupLimit?: number;
  placement?: BpqlChartPlacement;
  order?: number;
  color?: string;
};

export type BpqlAggregateRow = { group: string | null; value: number };
export type BpqlAggregateResult = { rows: BpqlAggregateRow[]; aggFunction: BpqlAggFunction };
export type BpqlChartDataResult = { chart: BpqlChart; rows: BpqlAggregateRow[] };

export type BpqlAggregateQuery = {
  table: string;
  groupByField?: string;
  metricField?: string;
  aggFunction: BpqlAggFunction;
  search?: string;
  where?: BpqlWhereClause[];
  groupLimit?: number;
};

export function listBpqlSavedQueries(tableSlug?: string): Promise<BpqlSavedQuery[]> {
  return apiFetch<BpqlSavedQuery[]>(`/bpql/queries${buildQueryString({ table: tableSlug })}`);
}

export function createBpqlSavedQuery(input: BpqlSavedQueryInput): Promise<BpqlSavedQuery> {
  return apiFetch<BpqlSavedQuery>('/bpql/queries', { method: 'POST', body: input });
}

export function updateBpqlSavedQuery(
  id: string,
  input: Partial<BpqlSavedQueryInput>,
): Promise<BpqlSavedQuery> {
  return apiFetch<BpqlSavedQuery>(`/bpql/queries/${id}`, { method: 'PATCH', body: input });
}

export function deleteBpqlSavedQuery(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/bpql/queries/${id}`, { method: 'DELETE' });
}

export function listBpqlCharts(
  filter: { placement?: BpqlChartPlacement; table?: string } = {},
): Promise<BpqlChart[]> {
  return apiFetch<BpqlChart[]>(`/bpql/charts${buildQueryString(filter)}`);
}

export function createBpqlChart(input: BpqlChartInput): Promise<BpqlChart> {
  return apiFetch<BpqlChart>('/bpql/charts', { method: 'POST', body: input });
}

export function updateBpqlChart(id: string, input: Partial<BpqlChartInput>): Promise<BpqlChart> {
  return apiFetch<BpqlChart>(`/bpql/charts/${id}`, { method: 'PATCH', body: input });
}

export function deleteBpqlChart(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/bpql/charts/${id}`, { method: 'DELETE' });
}

export function getBpqlChartData(id: string): Promise<BpqlChartDataResult> {
  return apiFetch<BpqlChartDataResult>(`/bpql/charts/${id}/data`);
}

export function runBpqlAggregateQuery(query: BpqlAggregateQuery): Promise<BpqlAggregateResult> {
  return apiFetch<BpqlAggregateResult>('/bpql/query/aggregate', {
    method: 'POST',
    body: query,
  });
}
