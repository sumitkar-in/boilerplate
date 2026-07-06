import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircle } from 'lucide-react';
import type { AvailableModule } from '../../api-client';

type CreateTenantCardProps = {
  framed?: boolean;
  showHeading?: boolean;
  slug: string;
  onSlugChange: (slug: string) => void;
  availableModules: AvailableModule[];
  selectedFeatures: Set<string>;
  onToggleFeature: (key: string) => void;
  submitting: boolean;
  onSubmit: (event: FormEvent) => void;
};

export function CreateTenantCard({
  framed = true,
  showHeading = true,
  slug,
  onSlugChange,
  availableModules,
  selectedFeatures,
  onToggleFeature,
  submitting,
  onSubmit,
}: CreateTenantCardProps) {
  const { t } = useTranslation();

  return (
    <form className={framed ? 'card settings-panel' : 'tenant-create-form'} onSubmit={onSubmit}>
      {showHeading && (
        <h2 className="section-title">
          <PlusCircle size={18} />
          {t('adminTenants.createTenant')}
        </h2>
      )}
      <label>
        {t('adminTenants.slug')}
        <input
          type="text"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          pattern="[a-z0-9-]+"
          placeholder={t('adminTenants.slugPlaceholder')}
          required
        />
      </label>
      {availableModules.length > 0 && (
        <fieldset className="checkbox-list">
          <legend className="hint-text">{t('adminTenants.enabledModules')}</legend>
          {availableModules.map((mod) => (
            <label key={mod.key} className="checkbox-row">
              <input
                type="checkbox"
                checked={selectedFeatures.has(mod.key)}
                onChange={() => onToggleFeature(mod.key)}
              />
              {mod.label}
            </label>
          ))}
        </fieldset>
      )}
      <button type="submit" className="button" disabled={submitting}>
        {submitting ? t('adminTenants.creating') : t('adminTenants.createBtn')}
      </button>
    </form>
  );
}
