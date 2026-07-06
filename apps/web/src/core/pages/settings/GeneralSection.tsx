import { Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SearchableSelect, Select } from '@boilerplate/ui-common';
import { useSettingsSection } from './useSettingsSection';
import { SettingsPanel, SettingsSaveBar } from './SettingsSectionChrome';

interface IntlWithSupportedValues {
  supportedValuesOf(key: 'timeZone' | 'currency'): string[];
}
const TIMEZONE_OPTIONS = (Intl as unknown as IntlWithSupportedValues).supportedValuesOf('timeZone').map((tz) => ({ value: tz, label: tz }));
const CURRENCY_OPTIONS = (Intl as unknown as IntlWithSupportedValues).supportedValuesOf('currency').map((c) => ({ value: c, label: c }));

const DEFAULTS = { timezone: 'UTC', locale: 'en', dateFormat: 'MMM d, yyyy', currency: 'USD', weekStartsOn: 'monday' };

export function GeneralSection() {
  const { t } = useTranslation();
  const { value, update, save, saving, reset, loading } = useSettingsSection('general', DEFAULTS);

  return (
    <SettingsPanel title={t('tenantSettings.generalTitle')} icon={<Settings2 size={20} />}>
      <div className="tenant-settings-form-grid">
        <SearchableSelect label={t('tenantSettings.generalTimezoneLabel')} value={value.timezone} options={TIMEZONE_OPTIONS} searchPlaceholder="Search timezone..." emptyMessage="No timezones found" onValueChange={(timezone) => update({ timezone })} />
        <Select label={t('tenantSettings.generalLocaleLabel')} value={value.locale} options={[{ value: 'en', label: t('tenantSettings.generalLocaleEnglish') }, { value: 'hi', label: t('tenantSettings.generalLocaleHindi') }, { value: 'fr', label: t('tenantSettings.generalLocaleFrench') }]} onChange={(event) => update({ locale: event.target.value })} />
        <Select label={t('tenantSettings.generalDateFormatLabel')} value={value.dateFormat} options={[{ value: 'MMM d, yyyy', label: t('tenantSettings.generalDateFormatOption1') }, { value: 'dd/MM/yyyy', label: t('tenantSettings.generalDateFormatOption2') }, { value: 'MM/dd/yyyy', label: t('tenantSettings.generalDateFormatOption3') }]} onChange={(event) => update({ dateFormat: event.target.value })} />
        <SearchableSelect label={t('tenantSettings.generalCurrencyLabel')} value={value.currency} options={CURRENCY_OPTIONS} searchPlaceholder="Search currency..." emptyMessage="No currencies found" onValueChange={(currency) => update({ currency })} />
        <Select label={t('tenantSettings.generalWeekStartsOnLabel')} value={value.weekStartsOn} options={[{ value: 'monday', label: t('tenantSettings.generalWeekStartsMondayLabel') }, { value: 'sunday', label: t('tenantSettings.generalWeekStartsSundayLabel') }]} onChange={(event) => update({ weekStartsOn: event.target.value })} />
      </div>
      <SettingsSaveBar saving={saving} loading={loading} onReset={reset} onSave={() => void save()} />
    </SettingsPanel>
  );
}
