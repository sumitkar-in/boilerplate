import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { AdvancedDataTable, Button, ConfirmDialog, EmptyState } from '@boilerplate/ui-common';
import { ViewToolbar } from '../../../core/components/ViewToolbar';
import type { Visitor, VisitorInput } from '../api';
import { useVisitorColumns } from '../components/useVisitorColumns';
import { VisitorFormModal } from '../components/VisitorFormModal';
import { useVisitorsData } from '../hooks/useVisitorsData';

export function VisitorPage() {
  const data = useVisitorsData();
  const [editing, setEditing] = useState<Visitor | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Visitor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const tableColumns = useVisitorColumns({
    onEdit: (row) => {
      setEditing(row);
      setIsFormOpen(true);
    },
    onDelete: setPendingDelete,
    onExit: data.handleExit,
  });

  async function handleSubmit(input: VisitorInput) {
    setIsSubmitting(true);
    const saved = await data.saveVisitor(editing?.id ?? null, input);
    setIsSubmitting(false);
    if (saved) setIsFormOpen(false);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    const removed = await data.removeVisitor(pendingDelete.id);
    setIsDeleting(false);
    if (removed) setPendingDelete(null);
  }

  const hasNoDataAtAll = data.rows !== null && data.total === 0 && !data.table.search.trim();

  return (
    <section className="boilerplate-view-container employee-grid-view" aria-label="Visitors">
      <ViewToolbar
        viewName="All Visitors"
        count={data.total}
        primaryActionLabel="Create Visitor"
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
            title="No visitors found"
            description="Get started by creating your first visitor."
            action={
              <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                <Plus size={16} />
                Create Visitor
              </Button>
            }
          />
        ) : (
          <AdvancedDataTable<Visitor>
            data={data.rows ?? []}
            columns={tableColumns}
            rowKey={(row) => row.id}
            isLoading={data.rows === null}
            emptyMessage="No visitors match the current filters."
            searchPlaceholder="Search visitors..."
            searchValue={data.table.search}
            onSearchChange={data.table.setSearch}
            sort={data.table.sort}
            onSortChange={data.table.onSortChange}
            pagination={{
              page: data.table.page,
              pageSize: data.table.pageSize,
              total: data.total,
              onPageChange: data.table.setPage,
              onPageSizeChange: data.table.setPageSize,
            }}
          />
        )}
      </div>

      <VisitorFormModal
        isOpen={isFormOpen}
        visitor={editing}
        isSubmitting={isSubmitting}
        onClose={() => setIsFormOpen(false)}
        onSubmit={(input) => void handleSubmit(input)}
      />

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete Visitor"
        message="Are you sure you want to delete this visitor? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        isConfirming={isDeleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
