import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFeatureFlag, useServerTable, useToast } from '@boilerplate/ui-common';
import { listDepartments, type Department } from '../../departments/api';
import {
  createCustomField,
  createEmployee,
  deleteCustomField,
  deleteEmployee,
  listCustomFields,
  listEmployees,
  updateCustomField,
  updateEmployee,
  type Employee,
  type EmployeeCustomField,
  type EmployeeCustomFieldInput,
  type EmployeeInput,
} from '../api';

// Dropdown data (departments) isn't paginated — fetch one generous page.
const DROPDOWN_LIMIT = 500;

export function useEmployeesData() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const departmentsEnabled = useFeatureFlag('departments');

  const [rows, setRows] = useState<Employee[] | null>(null);
  const [total, setTotal] = useState(0);
  const table = useServerTable();
  const [departmentFilter, setDepartmentFilterValue] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [customFields, setCustomFields] = useState<EmployeeCustomField[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  const { query: tableQuery, page: tablePage, pageSize: tablePageSize, setPage: setTablePage } = table;

  const load = useCallback(async () => {
    try {
      const result = await listEmployees({
        ...tableQuery,
        departmentId: departmentFilter || undefined,
      });
      // If a delete/filter change left us past the last page, snap back.
      if (result.rows.length === 0 && result.total > 0 && tablePage > 0) {
        setTablePage(Math.max(0, Math.ceil(result.total / tablePageSize) - 1));
        return;
      }
      setRows(result.rows);
      setTotal(result.total);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('employees.loadFailed'), 'error');
    }
  }, [departmentFilter, showToast, t, tableQuery, tablePage, tablePageSize, setTablePage]);

  // Debounced so typing in the global search doesn't fire a request per key.
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  // Narrowing criteria restart pagination from the first page.
  const changeDepartmentFilter = useCallback((value: string) => {
    setDepartmentFilterValue(value);
    setTablePage(0);
  }, [setTablePage]);

  useEffect(() => {
    if (!departmentsEnabled) return;
    listDepartments({ limit: DROPDOWN_LIMIT }).then(
      (result) => setDepartments(result.rows),
      () => setDepartments([]),
    );
  }, [departmentsEnabled]);

  useEffect(() => {
    listCustomFields().then(setCustomFields, (err: unknown) => {
      showToast(err instanceof Error ? err.message : t('employees.loadFailed'), 'error');
    });
  }, [showToast, t]);

  useEffect(() => {
    listEmployees({ limit: DROPDOWN_LIMIT }).then(
      (result) => setAllEmployees(result.rows),
      () => setAllEmployees([]),
    );
  }, []);

  async function saveEmployee(editingId: string | null, input: EmployeeInput): Promise<boolean> {
    try {
      if (editingId) await updateEmployee(editingId, input);
      else await createEmployee(input);
      showToast(t('employees.saveSuccess'), 'success');
      await load();
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('employees.saveFailed'), 'error');
      return false;
    }
  }

  async function removeEmployee(id: string): Promise<boolean> {
    try {
      await deleteEmployee(id);
      showToast(t('employees.deleteSuccess'), 'success');
      await load();
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('employees.deleteFailed'), 'error');
      return false;
    }
  }

  async function saveCell(row: Employee, columnKey: string, value: string) {
    const nextValue = value.trim();
    let patch: Partial<EmployeeInput>;
    if (columnKey === 'department') {
      patch = { departmentId: nextValue || null };
    } else if (columnKey === 'manager') {
      patch = { managerId: nextValue || null };
    } else if (columnKey.startsWith('custom:')) {
      patch = { customFields: { [columnKey.slice('custom:'.length)]: nextValue } };
    } else {
      if (!nextValue) {
        showToast(t('employees.validationRequired'), 'error');
        return;
      }
      patch = { [columnKey]: nextValue };
    }
    try {
      const updated = await updateEmployee(row.id, patch);
      setRows((current) => current?.map((item) => (item.id === row.id ? updated : item)) ?? current);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('employees.saveFailed'), 'error');
    }
  }

  async function addCustomField(input: EmployeeCustomFieldInput): Promise<EmployeeCustomField | null> {
    try {
      const field = await createCustomField(input);
      setCustomFields((current) => [...current, field]);
      return field;
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('employees.fieldSaveFailed'), 'error');
      return null;
    }
  }

  async function renameCustomField(id: string, label: string): Promise<boolean> {
    try {
      const field = await updateCustomField(id, { label });
      setCustomFields((current) => current.map((entry) => (entry.id === id ? field : entry)));
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('employees.fieldSaveFailed'), 'error');
      return false;
    }
  }

  async function removeCustomField(id: string) {
    try {
      await deleteCustomField(id);
      setCustomFields((current) => current.filter((field) => field.id !== id));
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('employees.fieldDeleteFailed'), 'error');
    }
  }

  return {
    rows,
    total,
    table,
    departmentFilter,
    setDepartmentFilter: changeDepartmentFilter,
    departments,
    departmentsEnabled,
    customFields,
    allEmployees,
    reload: load,
    saveEmployee,
    removeEmployee,
    saveCell,
    addCustomField,
    renameCustomField,
    removeCustomField,
  };
}
