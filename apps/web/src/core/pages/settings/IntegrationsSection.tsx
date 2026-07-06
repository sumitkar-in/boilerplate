import { useEffect, useState } from 'react';
import { Link as LinkIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input, Select } from '@boilerplate/ui-common';
import { listKnowledgeModels } from '../../../modules/knowledge-bot/api';
import { useSettingsSection } from './useSettingsSection';
import { SettingsPanel, SettingsSaveBar } from './SettingsSectionChrome';

const DEFAULTS = { webhookUrl: '', supportEmail: '', aiModel: 'qwen3:0.6b' };

export function IntegrationsSection() {
  const { t } = useTranslation();
  const { value, update, save, saving, reset, loading } = useSettingsSection('integrations', DEFAULTS);
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    listKnowledgeModels().then(
      (nextModels) => { if (active) setModels(nextModels); },
      () => {},
    );
    return () => { active = false; };
  }, []);

  return (
    <SettingsPanel title={t('tenantSettings.integrationsTitle')} icon={<LinkIcon size={20} />}>
      <Input label={t('tenantSettings.integrationsWebhookUrlLabel')} value={value.webhookUrl} onChange={(event) => update({ webhookUrl: event.target.value })} placeholder={t('tenantSettings.integrationsWebhookUrlPlaceholder')} />
      <Input label={t('tenantSettings.integrationsSupportEmailLabel')} value={value.supportEmail} onChange={(event) => update({ supportEmail: event.target.value })} placeholder={t('tenantSettings.integrationsSupportEmailPlaceholder')} />
      {models.length > 0 ? (
        <Select
          label={t('tenantSettings.integrationsAiModelLabel')}
          value={value.aiModel}
          options={models.map((item) => ({ value: item, label: item }))}
          onChange={(event) => update({ aiModel: event.target.value })}
        />
      ) : (
        <Input
          label={t('tenantSettings.integrationsAiModelLabel')}
          value={value.aiModel}
          onChange={(event) => update({ aiModel: event.target.value })}
          placeholder="qwen3:0.6b"
          helperText={t('tenantSettings.integrationsAiModelHelper')}
        />
      )}
      <SettingsSaveBar saving={saving} loading={loading} onReset={reset} onSave={() => void save()} />
    </SettingsPanel>
  );
}
