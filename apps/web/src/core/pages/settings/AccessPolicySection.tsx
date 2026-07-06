import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@boilerplate/ui-common';
import { useSettingsSection } from './useSettingsSection';
import { SettingsPanel, SettingsSaveBar } from './SettingsSectionChrome';

const DEFAULTS = { requireTwoFactor: false, sessionTimeoutMinutes: 480, allowedDomains: [] as string[] };

export function AccessPolicySection() {
  const { t } = useTranslation();
  const { value, update, save, saving, reset, loading } = useSettingsSection('security', DEFAULTS);

  return (
    <SettingsPanel title={t('tenantSettings.securityTitle')} icon={<Shield size={20} />}>
      <label className="checkbox-row tenant-setting-check">
        <input type="checkbox" checked={value.requireTwoFactor} onChange={(event) => update({ requireTwoFactor: event.target.checked })} />
        <span>{t('tenantSettings.securityRequireTwoFactorLabel')}</span>
      </label>
      <div className="tenant-settings-form-grid">
        <Input label={t('tenantSettings.securitySessionTimeoutLabel')} type="number" value={String(value.sessionTimeoutMinutes)} onChange={(event) => update({ sessionTimeoutMinutes: Number(event.target.value) })} />
        <Input label={t('tenantSettings.securityAllowedDomainsLabel')} value={value.allowedDomains.join(', ')} onChange={(event) => update({ allowedDomains: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder={t('tenantSettings.securityAllowedDomainsPlaceholder')} />
      </div>
      <div className="tenant-settings-links"><Link to="/settings/security">{t('tenantSettings.securityOpenSettingsLink')}</Link></div>
      <SettingsSaveBar saving={saving} loading={loading} onReset={reset} onSave={() => void save()} />
    </SettingsPanel>
  );
}
