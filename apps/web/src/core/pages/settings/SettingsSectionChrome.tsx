import type { ReactNode } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@boilerplate/ui-common';

export function SettingsPanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="tenant-settings-form">
      <h2 className="section-title">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

export function SettingsSaveBar({ saving, loading, onReset, onSave }: {
  saving: boolean;
  loading: boolean;
  onReset: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="button-row">
      <Button variant="ghost" onClick={onReset} disabled={loading || saving}>
        <RotateCcw size={16} />
        {t('tenantSettings.resetButton')}
      </Button>
      <Button variant="primary" onClick={onSave} disabled={loading || saving}>
        <Save size={16} />
        {saving ? t('tenantSettings.savingButton') : t('tenantSettings.saveButton')}
      </Button>
    </div>
  );
}
