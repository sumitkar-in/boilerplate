import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Users } from 'lucide-react';
import { AdvancedDataTable, Button, ConfirmDialog, EmptyState, SearchableSelect } from '@boilerplate/ui-common';
import { ViewToolbar } from '../../../core/components/ViewToolbar';
import { useStoredState } from '../../../core/hooks/useStoredState';
import type { Employee, EmployeeInput } from '../api';
import { EmployeeColumnManager } from '../components/EmployeeColumnManager';
import { EmployeeCsvActions } from '../components/EmployeeCsvActions';
import { EmployeeFormModal } from '../components/EmployeeFormModal';
import { useEmployeeColumns } from '../components/useEmployeeColumns';
import { useEmployeesData } from '../hooks/useEmployeesData';

// Hidden (not visible) keys are stored so newly added custom fields
// default to visible without any migration of the stored value.
const HIDDEN_COLUMNS_KEY = 'boilerplate.employeeHiddenColumns';

export function EmployeePage() {
  const { t } = useTranslation();
  const data = useEmployeesData();
  const [editing, setEditing] = useState<Employee | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useStoredState<string[]>(HIDDEN_COLUMNS_KEY, []);

  const allColumns = useEmployeeColumns({
    departments: data.departments,
    departmentsEnabled: data.departmentsEnabled,
    customFields: data.customFields,
    employees: data.allEmployees,
    onEdit: (row) => {
      setEditing(row);
      setIsFormOpen(true);
    },
    onDelete: setPendingDelete,
  });
  const tableColumns = allColumns.filter(
    (column) => column.kind === 'actions' || !hiddenColumns.includes(column.key),
  );

  function toggleColumn(columnKey: string) {
    setHiddenColumns((current) => {
      if (current.includes(columnKey)) return current.filter((key) => key !== columnKey);
      // Never allow hiding the last visible data column.
      if (tableColumns.length <= 2) return current;
      return [...current, columnKey];
    });
  }

  async function handleSubmit(input: EmployeeInput) {
    setIsSubmitting(true);
    const saved = await data.saveEmployee(editing?.id ?? null, input);
    setIsSubmitting(false);
    if (saved) setIsFormOpen(false);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    const removed = await data.removeEmployee(pendingDelete.id);
    setIsDeleting(false);
    if (removed) setPendingDelete(null);
  }

  const hasNoDataAtAll =
    data.rows !== null && data.total === 0 && !data.table.search.trim() && !data.departmentFilter;

  return (
    <section className="boilerplate-view-container employee-grid-view" aria-label={t('employees.title')}>
      <ViewToolbar
        viewName={t('employees.allEmployees')}
        count={data.total}
        primaryActionLabel={t('employees.createEmployee')}
        onPrimaryAction={() => {
          setEditing(null);
          setIsFormOpen(true);
        }}
      />

      <div className="ui-page-body">
        {hasNoDataAtAll ? (
          <EmptyState
            className="card empty-state--spacious"
            icon={<Users size={28} />}
            title={t('employees.emptyTitle')}
            description={t('employees.emptySubtitle')}
            action={
              <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                <Plus size={16} />
                {t('employees.createEmployee')}
              </Button>
            }
          />
        ) : (
          <AdvancedDataTable<Employee>
            data={data.rows ?? []}
            columns={tableColumns}
            rowKey={(row) => row.id}
            isLoading={data.rows === null}
            emptyMessage={t('employees.emptyFiltered')}
            searchPlaceholder={t('employees.searchPlaceholder')}
            searchValue={data.table.search}
            onSearchChange={data.table.setSearch}
            columnFilters={data.table.columnFilters}
            onColumnFilterChange={data.table.onColumnFilterChange}
            dynamicFilters={data.table.dynamicFilters}
            onDynamicFiltersChange={data.table.onDynamicFiltersChange}
            sort={data.table.sort}
            onSortChange={data.table.onSortChange}
            pagination={{
              page: data.table.page,
              pageSize: data.table.pageSize,
              total: data.total,
              onPageChange: data.table.setPage,
              onPageSizeChange: data.table.setPageSize,
            }}
            toolbarActions={
              <>
                {data.departmentsEnabled && data.departments.length > 0 && (
                  <SearchableSelect
                    className="toolbar-select"
                    value={data.departmentFilter}
                    placeholder={t('employees.allDepartments')}
                    searchPlaceholder={t('employees.searchPlaceholder')}
                    options={[
                      { value: '', label: t('employees.allDepartments') },
                      ...data.departments.map((department) => ({ value: department.id, label: department.name })),
                    ]}
                    onValueChange={data.setDepartmentFilter}
                  />
                )}
                <EmployeeCsvActions
                  search={data.table.search}
                  departmentId={data.departmentFilter}
                  onImported={() => void data.reload()}
                  onColumnsClick={() => setIsColumnManagerOpen(true)}
                />
              </>
            }
            onCellEdit={(row, column, value) => data.saveCell(row, column.key, value)}
          />
        )}
      </div>

      <EmployeeColumnManager
        isOpen={isColumnManagerOpen}
        columns={allColumns}
        visibleColumns={allColumns.map((column) => column.key).filter((key) => !hiddenColumns.includes(key))}
        customFields={data.customFields}
        onClose={() => setIsColumnManagerOpen(false)}
        onToggleColumn={toggleColumn}
        onShowAll={() => setHiddenColumns([])}
        onAddField={data.addCustomField}
        onRenameField={data.renameCustomField}
        onRemoveField={(id) => void data.removeCustomField(id)}
      />

      <EmployeeFormModal
        isOpen={isFormOpen}
        employee={editing}
        departments={data.departments}
        departmentsEnabled={data.departmentsEnabled}
        employees={data.allEmployees}
        customFields={data.customFields}
        isSubmitting={isSubmitting}
        onClose={() => setIsFormOpen(false)}
        onSubmit={(input) => void handleSubmit(input)}
      />

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title={t('employees.deleteConfirmTitle')}
        message={t('employees.deleteConfirm')}
        confirmLabel={t('employees.delete')}
        cancelLabel={t('employees.cancel')}
        danger
        isConfirming={isDeleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
