import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  Database,
  LayoutDashboard,
  Link as LinkIcon,
  Menu,
  Palette,
  Settings2,
  Shield,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@boilerplate/ui-common';
import { apiGetTenantSettings, type TenantSettings } from '../../api-client';

const SECTIONS = [
  { path: 'branding', labelKey: 'tenantSettings.sectionBranding', icon: Palette },
  { path: 'general', labelKey: 'tenantSettings.sectionGeneral', icon: Settings2 },
  { path: 'dashboard', labelKey: 'tenantSettings.sectionDashboard', icon: LayoutDashboard },
  { path: 'navigation', labelKey: 'tenantSettings.sectionNavigation', icon: Menu },
  { path: 'notifications', labelKey: 'tenantSettings.sectionNotifications', icon: Bell },
  { path: 'access-policy', labelKey: 'tenantSettings.sectionAccessPolicy', icon: Shield },
  { path: 'integrations', labelKey: 'tenantSettings.sectionIntegrations', icon: LinkIcon },
  { path: 'data', labelKey: 'tenantSettings.sectionData', icon: Database },
] as const;

/**
 * Settings hub: one sidebar-nav-backed shell shared by every tenant settings
 * section route (/settings/tenant/<section>). Loads the settings object once
 * and exposes { settings, loading, reload } to child routes via Outlet
 * context — each section owns its own edit/save cycle (see
 * useSettingsSection.ts) so sections stay independent single-purpose pages
 * instead of one big tabbed form.
 */
export function TenantSettingsLayout() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<TenantSettings | null>(null);

  const reload = useCallback(async () => {
    const data = await apiGetTenantSettings();
    setSettings(data);
    document.documentElement.style.setProperty('--accent', data.brandColor);
    document.title = data.companyName ? `${data.companyName} · Boilerplate` : 'Boilerplate';
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload().catch((err: unknown) => {
        showToast(err instanceof Error ? err.message : 'Could not load tenant settings', 'error');
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reload, showToast]);

  const settingsSummary = useMemo(() => {
    if (!settings) return [];
    return [
      `${settings.settings.general.timezone} timezone`,
      `${settings.settings.dashboard.widgets.length} dashboard widgets`,
      `${settings.settings.data.retentionDays} day retention`,
    ];
  }, [settings]);

  const outletContext = useMemo(
    () => ({ settings, loading: settings === null, reload }),
    [settings, reload],
  );

  return (
    <div className="page tenant-settings-page">
      <header className="page-header tenant-settings-header">
        <div>
          <h1 className="page-title">
            <Building2 size={26} />
            {t('tenantSettings.title')}
          </h1>
          <p className="hint-text">{t('tenantSettings.subtitle')}</p>
          <div className="tenant-settings-summary">
            {settingsSummary.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
        <button type="button" className="app-link" onClick={() => navigate('/settings/menu')}>
          {t('tenantSettings.sectionMenuOrder') || 'Menu order'}
        </button>
      </header>

      <div className="tenant-settings-shell">
        <aside className="tenant-settings-nav" aria-label="Tenant settings sections">
          {SECTIONS.map(({ path, labelKey, icon: Icon }) => (
            <NavLink key={path} to={path} end>
              <Icon size={16} />
              <span>{t(labelKey)}</span>
            </NavLink>
          ))}
        </aside>

        <section className="card tenant-settings-panel">
          <Outlet context={outletContext} />
        </section>
      </div>
    </div>
  );
}
