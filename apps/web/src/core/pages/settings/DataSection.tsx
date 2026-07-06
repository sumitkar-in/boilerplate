import { Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input, Select } from '@boilerplate/ui-common';
import { useSettingsSection } from './useSettingsSection';
import { SettingsPanel, SettingsSaveBar } from './SettingsSectionChrome';

const DEFAULTS = { retentionDays: 365, exportFormat: 'csv' };

export function DataSection() {
  const { t } = useTranslation();
  const { value, update, save, saving, reset, loading } = useSettingsSection('data', DEFAULTS);

  return (
    <SettingsPanel title={t('tenantSettings.dataTitle')} icon={<Database size={20} />}>
      <div className="tenant-settings-form-grid">
        <Input label={t('tenantSettings.dataRetentionDaysLabel')} type="number" value={String(value.retentionDays)} onChange={(event) => update({ retentionDays: Number(event.target.value) })} />
        <Select label={t('tenantSettings.dataDefaultExportFormatLabel')} value={value.exportFormat} options={[{ value: 'csv', label: t('tenantSettings.dataExportFormatCSV') }, { value: 'xlsx', label: t('tenantSettings.dataExportFormatXLSX') }, { value: 'json', label: t('tenantSettings.dataExportFormatJSON') }]} onChange={(event) => update({ exportFormat: event.target.value })} />
      </div>
      <SettingsSaveBar saving={saving} loading={loading} onReset={reset} onSave={() => void save()} />
    </SettingsPanel>
  );
}
