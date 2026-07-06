import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, ArrowRight, Building2, Layers, LayoutDashboard, Shield } from 'lucide-react';
import { useTenant } from '@boilerplate/ui-common';
import { AppIcon } from '../layout/components/AppIcon';
import { apiGetTenantSettings, type DashboardWidgetKey, type TenantSettings } from '../api-client';
import { BpqlChartsPanel } from '../../modules/bpql/components/BpqlChartsPanel';
import { listBpqlTables, type BpqlTable } from '../../modules/bpql/api';
function titleCase(key: string): string {
  return key.replace(
    /(^|-)([a-z])/g,
    (_, sep: string, ch: string) => `${sep ? ' ' : ''}${ch.toUpperCase()}`,
  );
}

function formatDashboardRange(range: string | undefined, t: ReturnType<typeof useTranslation>['t']): string {
  if (range === '7d') return t('tenantSettings.dashboardRange7Days');
  if (range === '90d') return t('tenantSettings.dashboardRange90Days');
  return t('tenantSettings.dashboardRange30Days');
}

function clampQuickLinkLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 6;
  return Math.max(0, Math.min(24, Math.floor(value ?? 6)));
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { tenantSlug, role, user, enabledFeatureKeys } = useTenant();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [tables, setTables] = useState<BpqlTable[]>([]);
  const featureKeys = Array.from(enabledFeatureKeys);
  const dashboard = settings?.settings.dashboard;
  const widgets = useMemo(
    () => new Set<DashboardWidgetKey>(dashboard?.widgets ?? ['tenant', 'role', 'modules', 'quickLinks']),
    [dashboard?.widgets],
  );
  const quickLinkLimit = clampQuickLinkLimit(dashboard?.quickLinkLimit);
  const activityRangeLabel = formatDashboardRange(dashboard?.defaultRange, t);

  useEffect(() => {
    let cancelled = false;
    apiGetTenantSettings().then(
      (data) => {
        if (!cancelled) setSettings(data);
      },
      () => {
        if (!cancelled) setSettings(null);
      },
    );
    listBpqlTables().then(
      (data) => {
        if (!cancelled) setTables(data);
      },
      () => {
        if (!cancelled) setTables([]);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">
            <LayoutDashboard size={26} />
            {dashboard?.title || (user?.fullName ? t('dashboard.welcomeName', { name: user.fullName }) : t('dashboard.welcome'))}
          </h1>
          <p className="hint-text">
            {dashboard?.subtitle || t('dashboard.signedInAs', { tenant: tenantSlug })}{' '}
            <span className="badge">{role}</span>
          </p>
        </div>
      </header>

      <section className="metric-grid" aria-label="Tenant summary">
        {widgets.has('tenant') && (
          <div className="metric-card">
            <span className="metric-label">
              <Building2 size={16} /> {t('dashboard.tenant')}
            </span>
            <span className="metric-value">{settings?.companyName || tenantSlug}</span>
          </div>
        )}
        {widgets.has('role') && (
          <div className="metric-card">
            <span className="metric-label">
              <Shield size={16} /> {t('dashboard.role')}
            </span>
            <span className="metric-value">{role}</span>
          </div>
        )}
        {widgets.has('modules') && (
          <div className="metric-card">
            <span className="metric-label">
              <Layers size={16} /> {t('dashboard.enabledModules')}
            </span>
            <span className="metric-value">{featureKeys.length}</span>
          </div>
        )}
        {widgets.has('activity') && (
          <div className="metric-card">
            <span className="metric-label">
              <Activity size={16} /> Activity range
            </span>
            <span className="metric-value">{activityRangeLabel}</span>
          </div>
        )}
      </section>

      {widgets.has('quickLinks') && (
        <section className="card">
          <h2 className="section-title">
            <Layers size={20} />
            {t('dashboard.enabledModules')}
          </h2>
          {featureKeys.length === 0 ? (
            <div className="empty-state">
              {t('dashboard.noModules')}
            </div>
          ) : (
            <div className="metric-grid">
              {featureKeys.slice(0, quickLinkLimit).map((key) => (
                <div className="metric-card module-tile" key={key}>
                  <span className="module-tile__name">
                    <AppIcon name={key} size={18} />
                    {titleCase(key)}
                  </span>
                  <Link to={`/${key}`} className="section-title">
                    {t('dashboard.open')} <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Render any BPQL charts pinned to the dashboard */}
      <section className="card" style={{ marginTop: '24px' }}>
        <h2 className="section-title">
          <Activity size={20} />
          {t('dashboard.customCharts', 'Dashboard KPIs & Charts')}
        </h2>
        <BpqlChartsPanel tables={tables} placement="dashboard" />
      </section>
    </div>
  );
}
