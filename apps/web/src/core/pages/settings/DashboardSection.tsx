import { LayoutDashboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input, Select, Textarea } from '@boilerplate/ui-common';
import type { DashboardWidgetKey } from '../../api-client';
import { useSettingsSection } from './useSettingsSection';
import { SettingsPanel, SettingsSaveBar } from './SettingsSectionChrome';

const DEFAULTS = {
  title: 'Workspace overview',
  subtitle: 'Track your tenant, modules, and shortcuts from one place.',
  defaultRange: '30d',
  widgets: ['tenant', 'role', 'modules', 'quickLinks'] as DashboardWidgetKey[],
  quickLinkLimit: 6,
};

export function DashboardSection() {
  const { t } = useTranslation();
  const { value, update, save, saving, reset, loading } = useSettingsSection('dashboard', DEFAULTS);

  const widgetOptions: Array<{ key: DashboardWidgetKey; label: string }> = [
    { key: 'tenant', label: t('tenantSettings.dashboardWidgetTenant') },
    { key: 'role', label: t('tenantSettings.dashboardWidgetRole') },
    { key: 'modules', label: t('tenantSettings.dashboardWidgetModules') },
    { key: 'quickLinks', label: t('tenantSettings.dashboardWidgetQuickLinks') },
    { key: 'activity', label: t('tenantSettings.dashboardWidgetActivity') },
  ];

  function toggleWidget(key: DashboardWidgetKey, checked: boolean) {
    update({ widgets: checked ? [...value.widgets, key] : value.widgets.filter((item) => item !== key) });
  }

  return (
    <SettingsPanel title={t('tenantSettings.dashboardTitle')} icon={<LayoutDashboard size={20} />}>
      <Input label={t('tenantSettings.dashboardTitleLabel')} value={value.title} onChange={(event) => update({ title: event.target.value })} />
      <Textarea label={t('tenantSettings.dashboardSubtitleLabel')} value={value.subtitle} rows={3} onChange={(event) => update({ subtitle: event.target.value })} />
      <div className="tenant-settings-form-grid">
        <Select label={t('tenantSettings.dashboardDefaultRangeLabel')} value={value.defaultRange} options={[{ value: '7d', label: t('tenantSettings.dashboardRange7Days') }, { value: '30d', label: t('tenantSettings.dashboardRange30Days') }, { value: '90d', label: t('tenantSettings.dashboardRange90Days') }]} onChange={(event) => update({ defaultRange: event.target.value })} />
        <Input label={t('tenantSettings.dashboardQuickLinkLimitLabel')} type="number" value={String(value.quickLinkLimit)} onChange={(event) => update({ quickLinkLimit: Number(event.target.value) })} />
      </div>
      <div className="tenant-checkbox-grid">
        {widgetOptions.map((widget) => (
          <label key={widget.key} className="checkbox-row">
            <input type="checkbox" checked={value.widgets.includes(widget.key)} onChange={(event) => toggleWidget(widget.key, event.target.checked)} />
            <span>{widget.label}</span>
          </label>
        ))}
      </div>
      <SettingsSaveBar saving={saving} loading={loading} onReset={reset} onSave={() => void save()} />
    </SettingsPanel>
  );
}
