import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Select } from '@boilerplate/ui-common';
import { useSettingsSection } from './useSettingsSection';
import { SettingsPanel, SettingsSaveBar } from './SettingsSectionChrome';

const DEFAULTS = { defaultCollapsed: false, moduleGrouping: 'category' as 'category' | 'flat', showSearch: true };

export function NavigationSection() {
  const { t } = useTranslation();
  const { value, update, save, saving, reset, loading } = useSettingsSection('navigation', DEFAULTS);

  return (
    <SettingsPanel title={t('tenantSettings.navigationTitle')} icon={<Menu size={20} />}>
      <div className="tenant-checkbox-grid">
        <label className="checkbox-row">
          <input type="checkbox" checked={value.defaultCollapsed} onChange={(event) => update({ defaultCollapsed: event.target.checked })} />
          <span>{t('tenantSettings.navigationCollapseSidebarLabel')}</span>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={value.showSearch} onChange={(event) => update({ showSearch: event.target.checked })} />
          <span>{t('tenantSettings.navigationShowSearchLabel')}</span>
        </label>
      </div>
      <Select
        label={t('tenantSettings.navigationModuleGroupingLabel')}
        value={value.moduleGrouping}
        options={[{ value: 'category', label: t('tenantSettings.navigationModuleGroupingCategory') }, { value: 'flat', label: t('tenantSettings.navigationModuleGroupingFlat') }]}
        onChange={(event) => update({ moduleGrouping: event.target.value as 'category' | 'flat' })}
      />
      <SettingsSaveBar saving={saving} loading={loading} onReset={reset} onSave={() => void save()} />
    </SettingsPanel>
  );
}
