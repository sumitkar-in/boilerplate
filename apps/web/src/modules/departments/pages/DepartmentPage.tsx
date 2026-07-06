import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Edit2, Plus, Trash2 } from 'lucide-react';
import {
  AdvancedDataTable,
  Button,
  ConfirmDialog,
  EmptyState,
  useServerTable,
  useToast,
  type AdvancedTableColumn,
} from '@boilerplate/ui-common';
import { ViewToolbar } from '../../../core/components/ViewToolbar';
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
  type Department,
  type DepartmentInput,
} from '../api';
import { DepartmentFormModal } from '../components/DepartmentFormModal';

export function DepartmentPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [rows, setRows] = useState<Department[] | null>(null);
  const [total, setTotal] = useState(0);
  const table = useServerTable();
  const [editing, setEditing] = useState<Department | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Department | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await listDepartments(table.query);
      setRows(result.rows);
      setTotal(result.total);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('departments.loadFailed'), 'error');
    }
  }, [showToast, t, table.query]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const columns = useMemo<AdvancedTableColumn<Department>[]>(
    () => [
      {
        key: 'name',
        title: t('departments.columnName'),
        getValue: (row) => row.name,
        render: (row) => <strong>{row.name}</strong>,
        editable: true,
        editType: 'text',
      },
      { 
        key: 'description', 
        title: t('departments.columnDescription'), 
        getValue: (row) => row.description ?? '',
        editable: true,
        editType: 'textarea',
      },
      {
        key: 'createdAt',
        title: t('departments.columnCreatedAt'),
        getValue: (row) => new Date(row.createdAt).toLocaleDateString(),
      },
      {
        key: 'actions',
        title: '',
        align: 'right',
        width: '106px',
        isAction: true,
        render: (row) => (
          <div className="ui-actions">
            <Button variant="ghost" size="sm" onClick={() => { setEditing(row); setIsFormOpen(true); }} title={t('departments.edit')}>
              <Edit2 size={14} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPendingDelete(row)} title={t('departments.delete')}>
              <Trash2 size={14} />
            </Button>
          </div>
        ),
      },
    ],
    [t],
  );

  async function handleSubmit(input: DepartmentInput) {
    setIsSubmitting(true);
    try {
      if (editing) await updateDepartment(editing.id, input);
      else await createDepartment(input);
      showToast(t('departments.saveSuccess'), 'success');
      setIsFormOpen(false);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('departments.saveFailed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteDepartment(pendingDelete.id);
      showToast(t('departments.deleteSuccess'), 'success');
      setPendingDelete(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('departments.deleteFailed'), 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  const hasNoDataAtAll = rows !== null && total === 0 && !table.search.trim();

  return (
    <section className="boilerplate-view-container" aria-label={t('departments.title')}>
      <ViewToolbar
        viewName={t('departments.allDepartments')}
        count={total}
        primaryActionLabel={t('departments.createDepartment')}
        onPrimaryAction={() => { setEditing(null); setIsFormOpen(true); }}
      />

      <div className="ui-page-body">
        {hasNoDataAtAll ? (
          <EmptyState
            className="card empty-state--spacious"
            icon={<Building2 size={28} />}
            title={t('departments.emptyTitle')}
            description={t('departments.emptySubtitle')}
            action={
              <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                <Plus size={16} />
                {t('departments.createDepartment')}
              </Button>
            }
          />
        ) : (
          <AdvancedDataTable<Department>
            data={rows ?? []}
            columns={columns}
            rowKey={(row) => row.id}
            isLoading={rows === null}
            emptyMessage={t('departments.emptyFiltered')}
            searchPlaceholder={t('departments.searchPlaceholder')}
            searchValue={table.search}
            onSearchChange={table.setSearch}
            columnFilters={table.columnFilters}
            onColumnFilterChange={table.onColumnFilterChange}
            dynamicFilters={table.dynamicFilters}
            onDynamicFiltersChange={table.onDynamicFiltersChange}
            sort={table.sort}
            onSortChange={table.onSortChange}
            exportFileName="departments"
            pagination={{
              page: table.page,
              pageSize: table.pageSize,
              total,
              onPageChange: table.setPage,
              onPageSizeChange: table.setPageSize,
            }}
            onCellEdit={async (row, column, value) => {
              try {
                const input: Partial<DepartmentInput> = {
                  name: row.name,
                  description: row.description ?? undefined,
                  [column.key]: value,
                };
                await updateDepartment(row.id, input);
                showToast(t('departments.saveSuccess'), 'success');
                await load();
              } catch (err) {
                showToast(err instanceof Error ? err.message : t('departments.saveFailed'), 'error');
                throw err;
              }
            }}
          />
        )}
      </div>

      <DepartmentFormModal
        isOpen={isFormOpen}
        department={editing}
        isSubmitting={isSubmitting}
        onClose={() => setIsFormOpen(false)}
        onSubmit={(input) => void handleSubmit(input)}
      />

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title={t('departments.deleteConfirmTitle')}
        message={t('departments.deleteConfirm')}
        confirmLabel={t('departments.delete')}
        cancelLabel={t('departments.cancel')}
        danger
        isConfirming={isDeleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
