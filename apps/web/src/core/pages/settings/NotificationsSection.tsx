import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input, Select } from '@boilerplate/ui-common';
import { useSettingsSection } from './useSettingsSection';
import { SettingsPanel, SettingsSaveBar } from './SettingsSectionChrome';

const DEFAULTS = { fromEmail: '', digestFrequency: 'weekly', enableInApp: true, enableEmail: false };

export function NotificationsSection() {
  const { t } = useTranslation();
  const { value, update, save, saving, reset, loading } = useSettingsSection('notifications', DEFAULTS);

  return (
    <SettingsPanel title={t('tenantSettings.notificationsTitle')} icon={<Bell size={20} />}>
      <div className="tenant-checkbox-grid">
        <label className="checkbox-row">
          <input type="checkbox" checked={value.enableInApp} onChange={(event) => update({ enableInApp: event.target.checked })} />
          <span>{t('tenantSettings.notificationsEnableInAppLabel')}</span>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={value.enableEmail} onChange={(event) => update({ enableEmail: event.target.checked })} />
          <span>{t('tenantSettings.notificationsEnableEmailLabel')}</span>
        </label>
      </div>
      <div className="tenant-settings-form-grid">
        <Input label={t('tenantSettings.notificationsFromEmailLabel')} value={value.fromEmail} onChange={(event) => update({ fromEmail: event.target.value })} />
        <Select label={t('tenantSettings.notificationsDigestFrequencyLabel')} value={value.digestFrequency} options={[{ value: 'never', label: t('tenantSettings.notificationsDigestNever') }, { value: 'daily', label: t('tenantSettings.notificationsDigestDaily') }, { value: 'weekly', label: t('tenantSettings.notificationsDigestWeekly') }]} onChange={(event) => update({ digestFrequency: event.target.value })} />
      </div>
      <SettingsSaveBar saving={saving} loading={loading} onReset={reset} onSave={() => void save()} />
    </SettingsPanel>
  );
}
