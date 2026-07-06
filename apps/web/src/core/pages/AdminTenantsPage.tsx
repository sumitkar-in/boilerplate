import { useCallback, useEffect, useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AdvancedDataTable, type AdvancedTableColumn, Button, Modal, useServerTable } from '@boilerplate/ui-common';
import { ViewToolbar } from '../components/ViewToolbar';
import {
  apiCreateTenant,
  apiDeleteTenant,
  apiListAvailableModules,
  apiListTenants,
  apiUpdateTenantStatus,
  type AdminTenantRow,
  type AvailableModule,
} from '../api-client';
import { CreateTenantCard } from './admin/CreateTenantCard';

export function AdminTenantsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<AdminTenantRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const table = useServerTable();
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'suspended'>('');
  const [availableModules, setAvailableModules] = useState<AvailableModule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadTenants = useCallback(async () => {
    try {
      const result = await apiListTenants({ ...table.query, status: statusFilter || undefined });
      setTenants(result.rows);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load tenants');
    }
  }, [statusFilter, table.query]);

  function changeStatusFilter(value: '' | 'active' | 'suspended') {
    setStatusFilter(value);
    table.setPage(0);
  }

  useEffect(() => {
    const timer = setTimeout(() => void loadTenants(), 250);
    return () => clearTimeout(timer);
  }, [loadTenants]);

  useEffect(() => {
    let cancelled = false;
    apiListAvailableModules().then(
      (mods) => { if (!cancelled) setAvailableModules(mods); },
      () => {},
    );
    return () => { cancelled = true; };
  }, []);

  function toggleFeature(key: string) {
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiCreateTenant(slug.trim().toLowerCase(), Array.from(selectedFeatures));
      setSlug('');
      setSelectedFeatures(new Set());
      setIsCreateModalOpen(false);
      await loadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create tenant');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCloseCreateModal() {
    if (submitting) return;
    setIsCreateModalOpen(false);
    setSlug('');
    setSelectedFeatures(new Set());
  }

  async function handleToggleStatus(tenant: AdminTenantRow) {
    setError(null);
    try {
      await apiUpdateTenantStatus(tenant.id, tenant.status === 'active' ? 'suspended' : 'active');
      await loadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update tenant status');
    }
  }

  async function handleDeleteTenant(tenant: AdminTenantRow) {
    if (!window.confirm(t('adminTenants.deleteConfirm', { slug: tenant.slug }))) return;
    setError(null);
    try {
      await apiDeleteTenant(tenant.id);
      await loadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete tenant');
    }
  }

  const columns = useMemo<AdvancedTableColumn<AdminTenantRow>[]>(
    () => [
      {
        key: 'slug',
        title: 'Slug',
        getValue: (row) => row.slug,
        filterable: false,
        render: (row) => (
          <div>
            <strong>{row.slug}</strong>
            <div className="hint-text" style={{ fontSize: 11 }}>{row.schemaName}</div>
          </div>
        ),
      },
      {
        key: 'status',
        title: 'Status',
        getValue: (row) => row.status,
        filterable: false,
        render: (row) => (
          <span className={`badge status-badge status-badge--${row.status}`}>
            {row.status}
          </span>
        ),
      },
      {
        key: 'memberCount',
        title: 'Users',
        getValue: (row) => String(row.memberCount),
        filterable: false,
        render: (row) => <span>{row.memberCount} users</span>,
      },
      {
        key: 'createdAt',
        title: 'Created At',
        getValue: (row) => new Date(row.createdAt).toLocaleDateString(),
        filterable: false,
      },
      {
        key: 'actions',
        title: '',
        isAction: true,
        align: 'right',
        render: (row) => (
          <div className="button-row">
            <Button variant="secondary" size="sm" onClick={() => navigate(`/admin/tenants/${row.id}`)}>
              Open
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void handleToggleStatus(row)}>
              {row.status === 'active' ? 'Suspend' : 'Activate'}
            </Button>
            <Button variant="danger" size="sm" onClick={() => void handleDeleteTenant(row)}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [navigate, handleDeleteTenant, handleToggleStatus],
  );

  return (
    <section className="boilerplate-view-container" aria-label={t('adminTenants.title')}>
      <ViewToolbar
        viewName={t('adminTenants.title')}
        count={total}
        primaryActionLabel={t('adminTenants.createBtn')}
        onPrimaryAction={() => setIsCreateModalOpen(true)}
      />
      {error && <p className="error-text" style={{ padding: '0 24px' }}>{error}</p>}

      <div className="ui-page-body" style={{ marginTop: '20px' }}>
        <AdvancedDataTable<AdminTenantRow>
          data={tenants ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={tenants === null}
          emptyMessage="No tenants found."
          searchPlaceholder="Search tenants"
          searchValue={table.search}
          onSearchChange={table.setSearch}
          sort={table.sort}
          onSortChange={table.onSortChange}
          pagination={{
            page: table.page,
            pageSize: table.pageSize,
            total,
            onPageChange: table.setPage,
            onPageSizeChange: table.setPageSize,
          }}
          toolbarActions={
            <select
              className="toolbar-select"
              value={statusFilter}
              aria-label="Status"
              onChange={(event) => changeStatusFilter(event.target.value as '' | 'active' | 'suspended')}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          }
        />
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title={t('adminTenants.createTenant')}
        maxWidth="760px"
      >
        <CreateTenantCard
          framed={false}
          showHeading={false}
          slug={slug}
          onSlugChange={setSlug}
          availableModules={availableModules}
          selectedFeatures={selectedFeatures}
          onToggleFeature={toggleFeature}
          submitting={submitting}
          onSubmit={(e) => void handleCreate(e)}
        />
      </Modal>
    </section>
  );
}
