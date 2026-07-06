import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Database, Plus, Search, Settings2, Table2, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, useToast } from '@boilerplate/ui-common';
import {
  createBpqlRow,
  createBpqlTable,
  deleteBpqlRow,
  deleteBpqlTable,
  listBpqlRows,
  listBpqlTables,
  updateBpqlRow,
  updateBpqlTable,
  type BpqlRow,
  type BpqlRowData,
  type BpqlTable,
  type BpqlTableInput,
} from '../api';
import { BpqlChartsPanel } from '../components/BpqlChartsPanel';
import { BpqlDataTable } from '../components/BpqlDataTable';
import { TableModal } from '../components/TableModal';
import { EMPTY_TABLE } from '../components/tableDefaults';
import { RowModal } from '../components/RowModal';

export function BpqlPage() {
  const { showToast } = useToast();
  const [view, setView] = useState<'data' | 'charts'>('data');
  const [tables, setTables] = useState<BpqlTable[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [rows, setRows] = useState<BpqlRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isRowModalOpen, setIsRowModalOpen] = useState(false);
  const [tableForm, setTableForm] = useState<BpqlTableInput>(EMPTY_TABLE);
  const [editingTableSlug, setEditingTableSlug] = useState('');
  const [rowForm, setRowForm] = useState<BpqlRowData>({});
  const [editingRow, setEditingRow] = useState<BpqlRow | null>(null);
  const [pendingDeleteTable, setPendingDeleteTable] = useState<BpqlTable | null>(null);
  const [pendingDeleteRow, setPendingDeleteRow] = useState<BpqlRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTable = useMemo(
    () => tables.find((table) => table.slug === selectedSlug) ?? null,
    [selectedSlug, tables],
  );

  async function loadTables() {
    try {
      const data = await listBpqlTables();
      setTables(data);
      setSelectedSlug((current) => current || data[0]?.slug || '');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load BPQL tables', 'error');
    }
  }

  async function loadRows() {
    if (!selectedSlug) {
      setRows([]);
      setTotal(0);
      return;
    }
    try {
      const result = await listBpqlRows(selectedSlug, { search: search.trim() || undefined, limit: 100 });
      setRows(result.rows);
      setTotal(result.total);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load BPQL rows', 'error');
    }
  }

  useEffect(() => {
    let cancelled = false;
    listBpqlTables().then(
      (data) => {
        if (cancelled) return;
        setTables(data);
        setSelectedSlug((current) => current || data[0]?.slug || '');
      },
      (err) => {
        if (!cancelled) {
          showToast(err instanceof Error ? err.message : 'Could not load BPQL tables', 'error');
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!selectedSlug) {
        setRows([]);
        setTotal(0);
        return;
      }
      listBpqlRows(selectedSlug, { search: search.trim() || undefined, limit: 100 }).then(
        (result) => {
          setRows(result.rows);
          setTotal(result.total);
        },
        (err) => {
          showToast(err instanceof Error ? err.message : 'Could not load BPQL rows', 'error');
        },
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [search, selectedSlug, showToast]);

  function openTableModal(table?: BpqlTable) {
    setEditingTableSlug(table?.slug ?? '');
    setTableForm(table ? {
      name: table.name,
      slug: table.slug,
      description: table.description,
      fields: table.fields,
    } : EMPTY_TABLE);
    setIsTableModalOpen(true);
  }

  function openRowModal(row?: BpqlRow) {
    if (!selectedTable) return;
    setEditingRow(row ?? null);
    setRowForm(row?.data ?? Object.fromEntries(selectedTable.fields.map((field) => [field.key, ''])));
    setIsRowModalOpen(true);
  }

  async function saveTable() {
    setIsSubmitting(true);
    try {
      const saved = editingTableSlug
        ? await updateBpqlTable(editingTableSlug, tableForm)
        : await createBpqlTable(tableForm);
      await loadTables();
      setSelectedSlug(saved.slug);
      setIsTableModalOpen(false);
      showToast('BPQL table saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save BPQL table', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveRow() {
    if (!selectedTable) return;
    setIsSubmitting(true);
    try {
      if (editingRow) await updateBpqlRow(selectedTable.slug, editingRow.id, rowForm);
      else await createBpqlRow(selectedTable.slug, rowForm);
      setIsRowModalOpen(false);
      await loadRows();
      showToast('BPQL row saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save BPQL row', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmDeleteTable() {
    if (!pendingDeleteTable) return;
    try {
      await deleteBpqlTable(pendingDeleteTable.slug);
      setPendingDeleteTable(null);
      setSelectedSlug('');
      await loadTables();
      showToast('BPQL table deleted', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete BPQL table', 'error');
    }
  }

  async function confirmDeleteRow() {
    if (!pendingDeleteRow || !selectedTable) return;
    try {
      await deleteBpqlRow(selectedTable.slug, pendingDeleteRow.id);
      setPendingDeleteRow(null);
      await loadRows();
      showToast('BPQL row deleted', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete BPQL row', 'error');
    }
  }

  return (
    <section className="bpql-page" aria-label="BPQL">
      <div className="bpql-header">
        <div>
          <p className="bpql-eyebrow">Tenant custom data</p>
          <h1>BPQL</h1>
          <span>{tables.length} custom tables · {total} rows in view</span>
        </div>
        <div className="bpql-actions">
          <div className="bpql-tabs">
            <button type="button" aria-current={view === 'data'} onClick={() => setView('data')}>
              <Table2 size={14} /> Data
            </button>
            <button type="button" aria-current={view === 'charts'} onClick={() => setView('charts')}>
              <BarChart3 size={14} /> Charts
            </button>
          </div>
          {view === 'data' && (
            <>
              <Button variant="ghost" onClick={() => openTableModal(selectedTable ?? undefined)} disabled={!selectedTable}>
                <Settings2 size={16} /> Table settings
              </Button>
              <Button variant="primary" onClick={() => openTableModal()}>
                <Plus size={16} /> New table
              </Button>
            </>
          )}
        </div>
      </div>

      {view === 'charts' ? (
        <BpqlChartsPanel tables={tables} placement="bpql" />
      ) : (
        <div className="bpql-layout">
          <aside className="bpql-sidebar">
            <div className="bpql-sidebar__title">
              <Database size={16} />
              <strong>Tables</strong>
            </div>
            {tables.map((table) => (
              <button
                key={table.id}
                type="button"
                aria-current={table.slug === selectedSlug}
                onClick={() => setSelectedSlug(table.slug)}
              >
                <span>{table.name}</span>
                <small>{table.slug}</small>
              </button>
            ))}
            {tables.length === 0 ? <p>Create a tenant table to start storing custom data.</p> : null}
          </aside>

          <main className="bpql-main">
            {selectedTable ? (
              <>
                <div className="bpql-table-header">
                  <div>
                    <h2>{selectedTable.name}</h2>
                    <p>{selectedTable.description || `${selectedTable.fields.length} fields`}</p>
                  </div>
                  <div className="bpql-actions">
                    <Button variant="ghost" onClick={() => setPendingDeleteTable(selectedTable)}>
                      <Trash2 size={16} /> Delete table
                    </Button>
                    <Button variant="primary" onClick={() => openRowModal()}>
                      <Plus size={16} /> Add row
                    </Button>
                  </div>
                </div>
                <div className="bpql-toolbar">
                  <label className="bpql-search">
                    <Search size={16} />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search BPQL data" />
                  </label>
                </div>
                <BpqlDataTable
                  table={selectedTable}
                  rows={rows}
                  onEdit={openRowModal}
                  onDelete={setPendingDeleteRow}
                />
              </>
            ) : (
              <div className="bpql-empty">
                <Table2 size={28} />
                <h2>No BPQL tables</h2>
                <p>Create a tenant-scoped custom table with typed fields.</p>
                <Button variant="primary" onClick={() => openTableModal()}>
                  <Plus size={16} /> New table
                </Button>
              </div>
            )}
          </main>
        </div>
      )}

      <TableModal
        isOpen={isTableModalOpen}
        form={tableForm}
        isSubmitting={isSubmitting}
        onClose={() => setIsTableModalOpen(false)}
        onChange={setTableForm}
        onSave={() => void saveTable()}
      />
      <RowModal
        isOpen={isRowModalOpen}
        table={selectedTable}
        value={rowForm}
        isSubmitting={isSubmitting}
        onClose={() => setIsRowModalOpen(false)}
        onChange={setRowForm}
        onSave={() => void saveRow()}
      />
      <ConfirmDialog
        isOpen={pendingDeleteTable !== null}
        title="Delete BPQL table?"
        message={pendingDeleteTable ? `Delete ${pendingDeleteTable.name} and all of its rows?` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => void confirmDeleteTable()}
        onCancel={() => setPendingDeleteTable(null)}
      />
      <ConfirmDialog
        isOpen={pendingDeleteRow !== null}
        title="Delete row?"
        message="This row will be permanently deleted."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => void confirmDeleteRow()}
        onCancel={() => setPendingDeleteRow(null)}
      />
    </section>
  );
}
