import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BpqlAggregateRow, BpqlChartType } from '../api';

// A small, theme-neutral categorical palette — swap for brand colors if
// this starter is customized. See skills/frontend-module/SKILL.md.
const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export type ChartRendererProps = {
  chartType: BpqlChartType;
  rows: BpqlAggregateRow[];
  color?: string | null;
  height?: number;
  error?: string;
};

/** Renders one BPQL chart's aggregated { group, value } rows with recharts. */
export function ChartRenderer({ chartType, rows, color, height = 220, error }: ChartRendererProps) {
  const data = rows.map((row) => ({ name: row.group ?? 'Total', value: row.value }));
  const accent = color || PALETTE[0];

  if (error) {
    return (
      <div className="bpql-chart-state bpql-chart-state--error" style={{ minHeight: height }}>
        <strong>Chart data unavailable</strong>
        <span>{error}</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bpql-chart-state" style={{ minHeight: height }}>
        <strong>No data</strong>
        <span>This chart has no matching rows yet.</span>
      </div>
    );
  }

  if (chartType === 'number') {
    const value = data[0]?.value ?? 0;
    return (
      <div className="bpql-chart-number" style={{ height }}>
        <span className="bpql-chart-number__value" style={{ color: accent }}>
          {value.toLocaleString()}
        </span>
      </div>
    );
  }

  if (chartType === 'table') {
    return (
      <div className="bpql-chart-table" style={{ maxHeight: height, overflowY: 'auto' }}>
        <table>
          <tbody>
            {data.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.value.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Tooltip />
          <Pie data={data} dataKey="value" nameKey="name" outerRadius="80%" label>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke={accent} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="value" stroke={accent} fill={accent} fillOpacity={0.25} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Default: bar
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill={accent} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
