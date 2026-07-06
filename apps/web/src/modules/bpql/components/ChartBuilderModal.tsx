import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Modal, SearchableSelect, Select, useToast } from '@boilerplate/ui-common';
import type {
  BpqlAggFunction,
  BpqlChart,
  BpqlChartInput,
  BpqlChartType,
  BpqlOperator,
  BpqlTable,
  BpqlWhereClause,
} from '../api';

const CHART_TYPES: Array<{ value: BpqlChartType; label: string }> = [
  { value: 'bar', label: 'Bar' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'pie', label: 'Pie' },
  { value: 'number', label: 'Number (KPI)' },
  { value: 'table', label: 'Table' },
];

const AGG_FUNCTIONS: Array<{ value: BpqlAggFunction; label: string }> = [
  { value: 'count', label: 'Count' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
];

const OPERATORS: Array<{ value: BpqlOperator; label: string }> = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'blank', label: 'Is blank' },
  { value: 'notBlank', label: 'Is not blank' },
  { value: 'greaterThan', label: 'Greater than' },
  { value: 'greaterOrEqual', label: 'Greater or equal' },
  { value: 'lessThan', label: 'Less than' },
  { value: 'lessOrEqual', label: 'Less or equal' },
];

type FormState = {
  table: string;
  name: string;
  description: string;
  chartType: BpqlChartType;
  groupByField: string;
  metricField: string;
  aggFunction: BpqlAggFunction;
  where: BpqlWhereClause[];
  groupLimit: number;
  color: string;
  showOnDashboard: boolean;
};

function emptyForm(defaultTable: string): FormState {
  return {
    table: defaultTable,
    name: '',
    description: '',
    chartType: 'bar',
    groupByField: '',
    metricField: '',
    aggFunction: 'count',
    where: [],
    groupLimit: 10,
    color: '',
    showOnDashboard: false,
  };
}

export type ChartBuilderModalProps = {
  isOpen: boolean;
  tables: BpqlTable[];
  chart: BpqlChart | null;
  onClose: () => void;
  onSaved: () => void;
  createChart: (input: BpqlChartInput) => Promise<BpqlChart>;
  updateChart: (id: string, input: Partial<BpqlChartInput>) => Promise<BpqlChart>;
};

export function ChartBuilderModal({
  isOpen,
  tables,
  chart,
  onClose,
  onSaved,
  createChart,
  updateChart,
}: ChartBuilderModalProps) {
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(() => emptyForm(tables[0]?.slug ?? ''));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formKey = isOpen ? (chart?.id ?? 'new') : null;
  const [seededKey, setSeededKey] = useState(formKey);
  if (formKey !== seededKey) {
    setSeededKey(formKey);
    if (formKey !== null) {
      if (chart) {
        const table = tables.find((item) => item.id === chart.tableId);
        setForm({
          table: table?.slug ?? tables[0]?.slug ?? '',
          name: chart.name,
          description: chart.description,
          chartType: chart.chartType,
          groupByField: chart.groupByField ?? '',
          metricField: chart.metricField ?? '',
          aggFunction: chart.aggFunction,
          where: chart.where,
          groupLimit: chart.groupLimit,
          color: chart.color ?? '',
          showOnDashboard: chart.placement === 'dashboard',
        });
      } else {
        setForm(emptyForm(tables[0]?.slug ?? ''));
      }
    }
  }

  const selectedTable = tables.find((item) => item.slug === form.table) ?? null;
  const fieldOptions = (selectedTable?.fields ?? []).map((field) => ({ value: field.key, label: field.label }));
  const numberFieldOptions = (selectedTable?.fields ?? [])
    .filter((field) => field.type === 'number')
    .map((field) => ({ value: field.key, label: field.label }));

  function updateWhere(index: number, patch: Partial<BpqlWhereClause>) {
    setForm((current) => ({
      ...current,
      where: current.where.map((clause, i) => (i === index ? { ...clause, ...patch } : clause)),
    }));
  }

  async function save() {
    if (!form.name.trim() || !form.table) return;
    if (form.aggFunction !== 'count' && !form.metricField) {
      showToast('Pick a metric field, or switch the aggregation to Count', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const input: BpqlChartInput = {
        table: form.table,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        chartType: form.chartType,
        groupByField: form.groupByField || undefined,
        metricField: form.metricField || undefined,
        aggFunction: form.aggFunction,
        where: form.where.filter((clause) => clause.field),
        groupLimit: form.groupLimit,
        color: form.color.trim() || undefined,
        placement: form.showOnDashboard ? 'dashboard' : 'bpql',
      };
      if (chart) await updateChart(chart.id, input);
      else await createChart(input);
      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save chart', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={chart ? 'Edit chart' : 'New chart'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void save()} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save chart'}
          </Button>
        </>
      }
    >
      <div className="bpql-form">
        <div className="bpql-form-row">
          <SearchableSelect
            label="Table"
            value={form.table}
            options={tables.map((table) => ({ value: table.slug, label: table.name }))}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, table: value, groupByField: '', metricField: '' }))
            }
          />
          <Select
            label="Chart type"
            value={form.chartType}
            options={CHART_TYPES}
            onChange={(event) => setForm((current) => ({ ...current, chartType: event.target.value as BpqlChartType }))}
          />
        </div>
        <div className="bpql-form-row">
          <Input
            label="Name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Deals by region"
          />
          <Input
            label="Color"
            value={form.color}
            onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
            placeholder="#3b82f6"
          />
        </div>
        <div className="bpql-form-row">
          <SearchableSelect
            label="Group by (optional for a single KPI number)"
            value={form.groupByField}
            options={[{ value: '', label: 'None' }, ...fieldOptions]}
            onValueChange={(value) => setForm((current) => ({ ...current, groupByField: value }))}
          />
          <Select
            label="Aggregation"
            value={form.aggFunction}
            options={AGG_FUNCTIONS}
            onChange={(event) => setForm((current) => ({ ...current, aggFunction: event.target.value as BpqlAggFunction }))}
          />
        </div>
        {form.aggFunction !== 'count' && (
          <SearchableSelect
            label="Metric field (numeric)"
            value={form.metricField}
            options={[{ value: '', label: 'Select a field' }, ...numberFieldOptions]}
            onValueChange={(value) => setForm((current) => ({ ...current, metricField: value }))}
          />
        )}

        <div className="bpql-field-list">
          <strong>Filters</strong>
          {form.where.map((clause, index) => (
            <div className="bpql-field-row" key={index}>
              <SearchableSelect
                label="Field"
                value={clause.field}
                options={[{ value: '', label: 'Select field' }, ...fieldOptions]}
                onValueChange={(value) => updateWhere(index, { field: value })}
              />
              <Select
                label="Operator"
                value={clause.operator}
                options={OPERATORS}
                onChange={(event) => updateWhere(index, { operator: event.target.value as BpqlOperator })}
              />
              {clause.operator !== 'blank' && clause.operator !== 'notBlank' && (
                <Input
                  label="Value"
                  value={clause.value ?? ''}
                  onChange={(event) => updateWhere(index, { value: event.target.value })}
                />
              )}
              <Button
                variant="ghost"
                onClick={() => setForm((current) => ({ ...current, where: current.where.filter((_, i) => i !== index) }))}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            onClick={() =>
              setForm((current) => ({
                ...current,
                where: [...current.where, { field: '', operator: 'equals', value: '' }],
              }))
            }
          >
            <Plus size={16} /> Add filter
          </Button>
        </div>

        <label className="bpql-check">
          <input
            type="checkbox"
            checked={form.showOnDashboard}
            onChange={(event) => setForm((current) => ({ ...current, showOnDashboard: event.target.checked }))}
          />
          Show on main dashboard
        </label>
      </div>
    </Modal>
  );
}
