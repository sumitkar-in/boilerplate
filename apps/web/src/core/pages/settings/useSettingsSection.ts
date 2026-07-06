import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '@boilerplate/ui-common';
import { apiUpdateTenantSettings, type TenantSettings, type TenantSettingsPayload } from '../../api-client';

export type TenantSettingsOutletContext = {
  settings: TenantSettings | null;
  loading: boolean;
  reload: () => Promise<void>;
};

export function useTenantSettingsOutletContext(): TenantSettingsOutletContext {
  return useOutletContext<TenantSettingsOutletContext>();
}

/**
 * Shared load/edit/save/reset cycle for one TenantSettingsPayload section.
 * Every settings section page should be built this same way — load the
 * section's saved value from the shared outlet context, let the user edit a
 * local draft, and save just that section (the backend deep-merges it with
 * the rest, so sections never clobber each other).
 */
export function useSettingsSection<K extends keyof TenantSettingsPayload>(
  section: K,
  defaults: TenantSettingsPayload[K],
) {
  const { settings, reload } = useTenantSettingsOutletContext();
  const { showToast } = useToast();
  const [value, setValue] = useState<TenantSettingsPayload[K]>(defaults);
  const [saving, setSaving] = useState(false);
  const settingsKey = settings ? JSON.stringify(settings.settings[section]) : null;
  const [seededKey, setSeededKey] = useState(settingsKey);
  if (settingsKey !== seededKey) {
    setSeededKey(settingsKey);
    if (settings) setValue({ ...defaults, ...settings.settings[section] });
  }

  function update(patch: Partial<TenantSettingsPayload[K]>) {
    setValue((current) => ({ ...current, ...patch }));
  }

  function reset() {
    if (settings) setValue({ ...defaults, ...settings.settings[section] });
  }

  async function save() {
    setSaving(true);
    try {
      await apiUpdateTenantSettings({ settings: { [section]: value } as Partial<TenantSettingsPayload> });
      await reload();
      showToast('Settings saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  return { value, update, save, saving, reset, loading: settings === null };
}
