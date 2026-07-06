import { useEffect, useState } from 'react';
import { LayoutDashboard, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, useToast } from '@boilerplate/ui-common';
import {
  createBpqlChart,
  deleteBpqlChart,
  getBpqlChartData,
  listBpqlCharts,
  updateBpqlChart,
  type BpqlAggregateRow,
  type BpqlChart,
  type BpqlTable,
} from '../api';
import { ChartRenderer } from './ChartRenderer';
import { ChartBuilderModal } from './ChartBuilderModal';

export type BpqlChartsPanelProps = {
  tables: BpqlTable[];
  // 'manage': BPQL page's own Charts tab — full CRUD over every chart,
  // regardless of where it's placed. 'embed': a read-only display of
  // just the charts pinned to the main app Dashboard.
  placement: 'bpql' | 'dashboard';
};

export function BpqlChartsPanel({ tables, placement }: BpqlChartsPanelProps) {
  const { showToast } = useToast();
  const manage = placement === 'bpql';
  const [charts, setCharts] = useState<BpqlChart[]>([]);
  const [chartData, setChartData] = useState<Record<string, BpqlAggregateRow[]>>({});
  const [chartErrors, setChartErrors] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<BpqlChart | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BpqlChart | null>(null);

  async function load() {
    try {
      // The manage view is the single home for every chart (so users can
      // see and toggle its dashboard placement); the embed view only
      // ever needs charts already pinned to the dashboard.
      const data = manage ? await listBpqlCharts() : await listBpqlCharts({ placement: 'dashboard' });
      setCharts(data);
      const entries = await Promise.all(
        data.map(async (chart) => {
          try {
            const result = await getBpqlChartData(chart.id);
            return { id: chart.id, rows: result.rows, error: '' };
          } catch (err) {
            return {
              id: chart.id,
              rows: [],
              error: err instanceof Error ? err.message : 'Could not load chart data',
            };
          }
        }),
      );
      setChartData(Object.fromEntries(entries.map((entry) => [entry.id, entry.rows])));
      setChartErrors(
        Object.fromEntries(
          entries
            .filter((entry) => entry.error)
            .map((entry) => [entry.id, entry.error]),
        ),
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load BPQL charts', 'error');
    }
  }

  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      if (active) await load();
    };
    void fetchAll();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manage]);

  async function toggleDashboardPin(chart: BpqlChart) {
    try {
      await updateBpqlChart(chart.id, {
        placement: chart.placement === 'dashboard' ? 'bpql' : 'dashboard',
      });
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update chart', 'error');
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteBpqlChart(pendingDelete.id);
      setPendingDelete(null);
      await load();
      showToast('Chart deleted', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete chart', 'error');
    }
  }

  return (
    <div className="bpql-charts-panel">
      {manage && (
        <div className="bpql-charts-panel__toolbar">
          <Button
            variant="primary"
            onClick={() => {
              setEditingChart(null);
              setIsModalOpen(true);
            }}
            disabled={tables.length === 0}
          >
            <Plus size={16} /> New chart
          </Button>
          {tables.length === 0 && <p className="hint-text">Create a table before adding a chart.</p>}
        </div>
      )}

      {charts.length === 0 ? (
        <div className="bpql-empty">
          <LayoutDashboard size={28} />
          <h2>No charts yet</h2>
          <p>
            {manage
              ? 'Build a bar, line, pie, or KPI card from a saved query or an ad hoc filter.'
              : 'Pin a chart to the dashboard from the BPQL Charts tab.'}
          </p>
        </div>
      ) : (
        <div className="bpql-chart-grid">
          {charts.map((chart) => (
            <article className="bpql-chart-card" key={chart.id}>
              <header>
                <div>
                  <h3>{chart.name}</h3>
                  {chart.description && <p>{chart.description}</p>}
                </div>
                {manage && (
                  <div className="ui-actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDashboardPin(chart)}
                      aria-label={chart.placement === 'dashboard' ? 'Unpin from dashboard' : 'Pin to dashboard'}
                      title={chart.placement === 'dashboard' ? 'Unpin from dashboard' : 'Pin to dashboard'}
                    >
                      <LayoutDashboard size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingChart(chart);
                        setIsModalOpen(true);
                      }}
                      aria-label="Edit chart"
                      title="Edit chart"
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete(chart)}
                      aria-label="Delete chart"
                      title="Delete chart"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </header>
              <ChartRenderer
                chartType={chart.chartType}
                rows={chartData[chart.id] ?? []}
                color={chart.color}
                error={chartErrors[chart.id]}
              />
            </article>
          ))}
        </div>
      )}

      {manage && (
        <ChartBuilderModal
          isOpen={isModalOpen}
          tables={tables}
          chart={editingChart}
          onClose={() => setIsModalOpen(false)}
          onSaved={async () => {
            setIsModalOpen(false);
            await load();
          }}
          createChart={createBpqlChart}
          updateChart={updateBpqlChart}
        />
      )}
      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete chart?"
        message={pendingDelete ? `Delete "${pendingDelete.name}"?` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
