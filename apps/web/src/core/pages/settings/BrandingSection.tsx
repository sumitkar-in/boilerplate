import { useState } from 'react';
import type { TFunction } from 'i18next';
import { ImageUp, Palette, RotateCcw, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input, useToast } from '@boilerplate/ui-common';
import { apiUpdateTenantSettings } from '../../api-client';
import { useTenantSettingsOutletContext } from './useSettingsSection';

const DEFAULT_BRAND_COLOR = '#35abc0';

type BrandingDraft = { companyName: string; brandColor: string; logoUrl: string };

export function BrandingSection() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { settings, reload } = useTenantSettingsOutletContext();
  const [draft, setDraft] = useState<BrandingDraft>({ companyName: '', brandColor: DEFAULT_BRAND_COLOR, logoUrl: '' });
  const [saving, setSaving] = useState(false);
  const settingsKey = settings
    ? JSON.stringify([settings.companyName, settings.brandColor, settings.logoUrl])
    : null;
  const [seededKey, setSeededKey] = useState(settingsKey);
  if (settingsKey !== seededKey) {
    setSeededKey(settingsKey);
    if (settings) {
      setDraft({
        companyName: settings.companyName ?? '',
        brandColor: settings.brandColor || DEFAULT_BRAND_COLOR,
        logoUrl: settings.logoUrl ?? '',
      });
    }
  }

  function update<K extends keyof BrandingDraft>(key: K, value: BrandingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleLogoFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Choose an image file for the logo', 'error');
      return;
    }
    if (file.size > 512 * 1024) {
      showToast('Logo image must be 512 KB or smaller', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') update('logoUrl', reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiUpdateTenantSettings(draft);
      await reload();
      showToast('Tenant settings saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save tenant settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (settings) {
      setDraft({
        companyName: settings.companyName ?? '',
        brandColor: settings.brandColor || DEFAULT_BRAND_COLOR,
        logoUrl: settings.logoUrl ?? '',
      });
    }
  }

  const loading = settings === null;
  const displayName = draft.companyName || settings?.tenantSlug || 'Company name';
  const logoInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="tenant-settings-grid">
      <div className="tenant-settings-form">
        <h2 className="section-title"><Palette size={20} /> {t('tenantSettings.brandingTitle')}</h2>
        <Input label={t('tenantSettings.brandingCompanyNameLabel')} value={draft.companyName} onChange={(event) => update('companyName', event.target.value)} placeholder={t('tenantSettings.brandingCompanyNamePlaceholder')} disabled={loading} />
        <label className="tenant-color-field">
          {t('tenantSettings.brandingDefaultColorLabel')}
          <span className="tenant-color-control">
            <input type="color" value={draft.brandColor} onChange={(event) => update('brandColor', event.target.value)} disabled={loading} />
            <input value={draft.brandColor} onChange={(event) => update('brandColor', event.target.value)} pattern="#[0-9a-fA-F]{6}" placeholder={DEFAULT_BRAND_COLOR} disabled={loading} />
          </span>
        </label>
        <Input label={t('tenantSettings.brandingLogoUrlLabel')} value={draft.logoUrl.startsWith('data:') ? '' : draft.logoUrl} onChange={(event) => update('logoUrl', event.target.value)} placeholder={t('tenantSettings.brandingLogoUrlPlaceholder')} helperText={draft.logoUrl.startsWith('data:') ? t('tenantSettings.brandingLogoUrlHelperUploaded') : t('tenantSettings.brandingLogoUrlHelper')} disabled={loading} />
        <label className="tenant-logo-upload">
          <ImageUp size={18} />
          {t('tenantSettings.brandingUploadLogoLabel')}
          <input type="file" accept="image/*" onChange={(event) => handleLogoFile(event.target.files?.[0])} disabled={loading} />
        </label>
        <div className="button-row">
          <Button variant="ghost" onClick={handleReset} disabled={loading || saving}>
            <RotateCcw size={16} />
            {t('tenantSettings.resetButton')}
          </Button>
          <Button variant="primary" onClick={() => void handleSave()} disabled={loading || saving}>
            <Save size={16} />
            {saving ? t('tenantSettings.savingButton') : t('tenantSettings.saveButton')}
          </Button>
        </div>
      </div>
      <BrandPreview displayName={displayName} slug={settings?.tenantSlug ?? 'tenant'} logoUrl={draft.logoUrl} logoInitial={logoInitial} brandColor={draft.brandColor} t={t} />
    </div>
  );
}

function BrandPreview({ displayName, slug, logoUrl, logoInitial, brandColor, t }: {
  displayName: string;
  slug: string;
  logoUrl: string;
  logoInitial: string;
  brandColor: string;
  t: TFunction;
}) {
  return (
    <section className="tenant-brand-preview" aria-label={t('tenantSettings.brandingPreviewLabel')}>
      <span className="metric-label">{t('tenantSettings.brandingPreviewLabel')}</span>
      <div className="tenant-brand-preview__header" style={{ background: brandColor }}>
        <div className="tenant-brand-preview__logo">
          {logoUrl ? <img src={logoUrl} alt="" /> : <span>{logoInitial}</span>}
        </div>
        <div>
          <strong>{displayName}</strong>
          <small>{slug}</small>
        </div>
      </div>
      <div className="tenant-brand-preview__body">
        <span style={{ background: brandColor }} />
        <div>
          <strong>{t('tenantSettings.brandingApplicationChromeTitle')}</strong>
          <small>{t('tenantSettings.brandingApplicationChromeDescription')}</small>
        </div>
      </div>
    </section>
  );
}
