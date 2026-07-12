import { useCallback, useEffect, useState } from 'react';
import { useServerTable, useToast } from '@boilerplate/ui-common';
import {
  createVisitor,
  deleteVisitor,
  listVisitors,
  updateVisitor,
  type Visitor,
  type VisitorInput,
} from '../api';

export function useVisitorsData() {
  const { showToast } = useToast();

  const [rows, setRows] = useState<Visitor[] | null>(null);
  const [total, setTotal] = useState(0);
  const table = useServerTable();

  const { query: tableQuery, page: tablePage, pageSize: tablePageSize, setPage: setTablePage } = table;

  const load = useCallback(async () => {
    try {
      const result = await listVisitors(tableQuery);
      // If a delete/filter change left us past the last page, snap back.
      if (result.rows.length === 0 && result.total > 0 && tablePage > 0) {
        setTablePage(Math.max(0, Math.ceil(result.total / tablePageSize) - 1));
        return;
      }
      setRows(result.rows);
      setTotal(result.total);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load visitors', 'error');
    }
  }, [showToast, tableQuery, tablePage, tablePageSize, setTablePage]);

  // Debounced so typing in the global search doesn't fire a request per key.
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function saveVisitor(editingId: string | null, input: VisitorInput): Promise<boolean> {
    try {
      if (editingId) await updateVisitor(editingId, input);
      else await createVisitor(input);
      showToast('Visitor saved successfully', 'success');
      await load();
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save visitor', 'error');
      return false;
    }
  }

  async function removeVisitor(id: string): Promise<boolean> {
    try {
      await deleteVisitor(id);
      showToast('Visitor deleted successfully', 'success');
      await load();
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete visitor', 'error');
      return false;
    }
  }

  async function handleExit(id: string): Promise<boolean> {
    try {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      await updateVisitor(id, { exitTime: now.toISOString().slice(0, 16) });
      showToast('Exit marked successfully', 'success');
      await load();
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to mark exit', 'error');
      return false;
    }
  }

  return {
    rows,
    total,
    table,
    reload: load,
    saveVisitor,
    removeVisitor,
    handleExit,
  };
}
