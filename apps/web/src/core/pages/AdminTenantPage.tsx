import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Settings,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Button, useTenant } from '@boilerplate/ui-common';
import type { TenantRole } from '@boilerplate/ui-common';
import {
  apiDeleteTenant,
  apiImpersonateTenantUser,
  apiListTenantAuditLogs,
  apiListTenantFeatures,
  apiListTenantMembers,
  apiListTenants,
  apiSuperAdminCreateInvite,
  apiSuperAdminCreateTenantUser,
  apiUpdateTenantFeature,
  apiUpdateTenantStatus,
  savePlatformSessionBackup,
  setSession,
  type AdminTenantRow,
  type AuditLogRow,
  type MemberRow,
  type TenantFeatureRow,
} from '../api-client';
import { TenantMembersPanel } from './admin/TenantMembersPanel';

type TenantPageData = {
  tenant: AdminTenantRow | null;
  members: MemberRow[];
  features: TenantFeatureRow[];
  auditLogs: AuditLogRow[];
};

function pickSettingsMember(members: MemberRow[]): MemberRow | undefined {
  return (
    members.find((member) => member.status === 'active' && member.role === 'owner') ??
    members.find((member) => member.status === 'active' && member.role === 'admin') ??
    members.find((member) => member.status === 'active')
  );
}

export function AdminTenantPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { refreshMe } = useTenant();
  const [tenant, setTenant] = useState<AdminTenantRow | null>(null);
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [features, setFeatures] = useState<TenantFeatureRow[] | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpeningSettings, setIsOpeningSettings] = useState(false);

  const settingsMember = useMemo(
    () => pickSettingsMember(members ?? []),
    [members],
  );

  async function fetchTenantPage(id: string): Promise<TenantPageData> {
    const [tenantList, memberRows, featureRows, logRows] = await Promise.all([
      apiListTenants({ limit: 500 }),
      apiListTenantMembers(id),
      apiListTenantFeatures(id),
      apiListTenantAuditLogs(id, { limit: 8 }),
    ]);

    return {
      tenant: tenantList.rows.find((item) => item.id === id) ?? null,
      members: memberRows,
      features: featureRows,
      auditLogs: logRows,
    };
  }

  function applyTenantPageData(data: TenantPageData) {
    setTenant(data.tenant);
    setMembers(data.members);
    setFeatures(data.features);
    setAuditLogs(data.auditLogs);
    setError(data.tenant ? null : 'Tenant not found');
  }

  async function reloadTenantPage() {
    if (!tenantId) return;
    try {
      applyTenantPageData(await fetchTenantPage(tenantId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load tenant');
    }
  }

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    fetchTenantPage(tenantId).then(
      (data) => {
        if (!cancelled) applyTenantPageData(data);
      },
      (err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load tenant');
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  async function handleToggleStatus() {
    if (!tenant) return;
    setError(null);
    try {
      await apiUpdateTenantStatus(
        tenant.id,
        tenant.status === 'active' ? 'suspended' : 'active',
      );
      await reloadTenantPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update tenant status');
    }
  }

  async function handleDeleteTenant() {
    if (!tenant) return;
    if (!window.confirm(`Delete tenant "${tenant.slug}" and its schema? This cannot be undone.`)) {
      return;
    }
    setError(null);
    try {
      await apiDeleteTenant(tenant.id);
      navigate('/admin/tenants', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete tenant');
    }
  }

  async function handleOpenAsTenant(member?: MemberRow, path = '/') {
    if (!tenant || !member) return;
    setError(null);
    setIsOpeningSettings(path === '/settings/tenant');
    try {
      savePlatformSessionBackup();
      const res = await apiImpersonateTenantUser(tenant.id, member.userId);
      setSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        tenantSlug: tenant.slug,
      });
      await refreshMe();
      navigate(path, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open tenant session');
    } finally {
      setIsOpeningSettings(false);
    }
  }

  async function handleFeatureToggle(feature: TenantFeatureRow) {
    if (!tenant) return;
    const next = !feature.enabled;
    setError(null);
    setFeatures((current) =>
      current?.map((row) =>
        row.key === feature.key ? { ...row, enabled: next } : row,
      ) ?? current,
    );
    try {
      await apiUpdateTenantFeature(tenant.id, feature.key, next);
    } catch (err) {
      setFeatures((current) =>
        current?.map((row) =>
          row.key === feature.key ? { ...row, enabled: feature.enabled } : row,
        ) ?? current,
      );
      setError(err instanceof Error ? err.message : 'Could not update feature');
    }
  }

  async function handleInviteUser(email: string, role: string) {
    if (!tenant) return;
    setError(null);
    try {
      await apiSuperAdminCreateInvite(tenant.id, email, role as TenantRole);
      await reloadTenantPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not invite user');
    }
  }

  async function handleAddUser(email: string, fullName: string, role: string) {
    if (!tenant) return;
    setError(null);
    try {
      const created = await apiSuperAdminCreateTenantUser(tenant.id, {
        email,
        fullName: fullName || undefined,
        role: role as TenantRole,
      });
      await reloadTenantPage();
      if (created.temporaryPassword) {
        setError(`Temporary password for ${created.email}: ${created.temporaryPassword}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add user');
    }
  }

  if (!tenant && !error) {
    return (
      <section className="boilerplate-view-container">
        <div className="full-page-spinner" role="status" aria-label="Loading tenant">
          <div className="spinner" />
        </div>
      </section>
    );
  }

  return (
    <section className="boilerplate-view-container admin-tenant-page">
      <div className="admin-tenant-header">
        <div>
          <Link to="/admin/tenants" className="admin-tenant-backlink">
            <ArrowLeft size={16} />
            Tenants
          </Link>
          <div className="admin-tenant-title-row">
            <Building2 size={28} />
            <div>
              <h1>{tenant?.slug ?? 'Tenant not found'}</h1>
              {tenant && (
                <p className="hint-text">
                  {tenant.schemaName} · Created {new Date(tenant.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {tenant && (
          <div className="button-row">
            <Button
              variant="secondary"
              onClick={() => void handleOpenAsTenant(settingsMember, '/settings/tenant')}
              disabled={!settingsMember || tenant.status !== 'active' || isOpeningSettings}
            >
              <Settings size={16} />
              Tenant settings
            </Button>
            <Button
              variant="ghost"
              onClick={() => void handleToggleStatus()}
            >
              {tenant.status === 'active' ? 'Suspend' : 'Activate'}
            </Button>
            <Button variant="danger" onClick={() => void handleDeleteTenant()}>
              <Trash2 size={16} />
              Delete
            </Button>
          </div>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      {tenant && (
        <>
          <div className="admin-tenant-summary">
            <div>
              <span className="metric-label">Status</span>
              <strong className={`badge status-badge status-badge--${tenant.status}`}>
                {tenant.status}
              </strong>
            </div>
            <div>
              <span className="metric-label">Users</span>
              <strong>{tenant.memberCount}</strong>
            </div>
            <div>
              <span className="metric-label">Enabled modules</span>
              <strong>{features?.filter((feature) => feature.enabled).length ?? 0}</strong>
            </div>
          </div>

          <div className="admin-tenant-grid">
            <TenantMembersPanel
              members={members}
              tenantActive={tenant.status === 'active'}
              onImpersonate={(member) => void handleOpenAsTenant(member)}
              onInviteUser={(email, role) => void handleInviteUser(email, role)}
              onAddUser={(email, fullName, role) => void handleAddUser(email, fullName, role)}
            />

            <section className="card admin-panel">
              <div className="panel-heading">
                <h2 className="section-title">
                  <ShieldCheck size={18} />
                  Features
                </h2>
              </div>
              <div className="feature-list admin-tenant-feature-list">
                {features?.map((feature) => (
                  <label key={feature.key} className="feature-toggle">
                    <span>
                      <strong>{feature.label}</strong>
                      <small>{feature.key}</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={feature.enabled}
                      onChange={() => void handleFeatureToggle(feature)}
                    />
                  </label>
                ))}
                {features?.length === 0 && <p className="hint-text">No feature modules available.</p>}
              </div>
            </section>

            <section className="card admin-panel admin-tenant-audit">
              <div className="panel-heading">
                <h2 className="section-title">Recent activity</h2>
              </div>
              <div className="admin-tenant-audit-list">
                {auditLogs?.map((log) => (
                  <div key={log.id} className="admin-tenant-audit-row">
                    <strong>{log.action}</strong>
                    <small>
                      {log.userEmail ?? 'System'} · {new Date(log.createdAt).toLocaleString()}
                    </small>
                  </div>
                ))}
                {auditLogs?.length === 0 && <p className="hint-text">No recent activity.</p>}
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
