import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, Shield } from 'lucide-react';
import { PERMISSION_CATALOG } from '@boilerplate/contracts';
import { Button, Checkbox, ConfirmDialog, Input, Modal, useToast } from '@boilerplate/ui-common';
import { useTranslation } from 'react-i18next';
import {
  apiCreateTenantRole,
  apiDeleteTenantRole,
  apiListTenantRoles,
  apiUpdateTenantRole,
  type TenantRoleRow,
} from '../api-client';

const EMPTY_FORM = { key: '', name: '', description: '', permissions: ['modules:read'] };

export function RolesSettingsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [roles, setRoles] = useState<TenantRoleRow[] | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TenantRoleRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadRoles() {
    try {
      setRoles(await apiListTenantRoles());
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('rolesSettings.loadFailed'), 'error');
    }
  }

  useEffect(() => {
    let cancelled = false;
    apiListTenantRoles().then(
      (rows) => {
        if (!cancelled) setRoles(rows);
      },
      (err: unknown) => {
        if (!cancelled) showToast(err instanceof Error ? err.message : t('rolesSettings.loadFailed'), 'error');
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  function openCreate() {
    setEditingKey(null);
    setForm(EMPTY_FORM);
    setIsCreateOpen(true);
  }

  function openEdit(role: TenantRoleRow) {
    setEditingKey(role.key);
    setForm({
      key: role.key,
      name: role.name,
      description: role.description ?? '',
      permissions: role.permissions ?? [],
    });
    setIsCreateOpen(true);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    try {
      if (editingKey) {
        await apiUpdateTenantRole(editingKey, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          permissions: form.permissions,
        });
      } else {
        await apiCreateTenantRole({
          key: form.key.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          permissions: form.permissions,
        });
      }
      setForm(EMPTY_FORM);
      setIsCreateOpen(false);
      showToast(editingKey ? t('rolesSettings.saveRoleButton') : t('rolesSettings.createRoleButton'), 'success');
      setEditingKey(null);
      await loadRoles();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('rolesSettings.createFailed'), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await apiDeleteTenantRole(pendingDelete.key);
      setPendingDelete(null);
      await loadRoles();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('rolesSettings.deleteFailed'), 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  function togglePermission(permission: string) {
    setForm((current) => {
      const selected = new Set(current.permissions);
      if (selected.has(permission)) selected.delete(permission);
      else selected.add(permission);
      return { ...current, permissions: Array.from(selected) };
    });
  }

  return (
    <section className="boilerplate-view-container" aria-label={t('rolesSettings.title')}>
      <header className="page-header roles-settings-header">
        <div>
          <h1 className="page-title">
            <Shield size={24} />
            {t('rolesSettings.title')}
          </h1>
          <p className="hint-text">{t('rolesSettings.subtitle')}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> {t('rolesSettings.addRoleButton')}
        </Button>
      </header>

      <div className="ui-page-body roles-settings-body">
        {roles?.length === 0 && <p className="hint-text">{t('rolesSettings.emptyState')}</p>}
        <div className="members-list">
          {roles?.map((role) => (
            <div key={role.key} className="members-list__row">
              <div>
                <strong>{role.name}</strong>
                <p className="hint-text">
                  {role.key} · {(role.permissions ?? []).join(', ')}
                  {role.isSystem && <> · {t('rolesSettings.systemRoleHint')}</>}
                </p>
              </div>
              <div className="members-list__row-actions">
                <Button variant="ghost" size="sm" disabled={role.isSystem} onClick={() => openEdit(role)}>
                  <Pencil size={14} /> {t('rolesSettings.editButton')}
                </Button>
                <Button variant="ghost" size="sm" disabled={role.isSystem} onClick={() => setPendingDelete(role)}>
                  {t('rolesSettings.deleteButton')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setForm(EMPTY_FORM); setEditingKey(null); }}
        title={editingKey ? t('rolesSettings.editRoleHeading') : t('rolesSettings.createRoleHeading')}
        maxWidth="720px"
      >
        <form onSubmit={(event) => void handleCreate(event)}>
          <Input
            label={t('rolesSettings.keyLabel')}
            value={form.key}
            onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
            placeholder={t('rolesSettings.keyPlaceholder')}
            disabled={editingKey !== null}
            required
          />
          <Input
            label={t('rolesSettings.nameLabel')}
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder={t('rolesSettings.namePlaceholder')}
            required
          />
          <Input
            label={t('rolesSettings.descriptionLabel')}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder={t('rolesSettings.descriptionPlaceholder')}
          />
          <div className="ui-field">
            <label>{t('rolesSettings.permissionsLabel')}</label>
            <div className="feature-grid">
              {PERMISSION_CATALOG.map((permission) => (
                <Checkbox
                  key={permission}
                  label={permission}
                  className="feature-checkbox"
                  checked={form.permissions.includes(permission)}
                  onChange={() => togglePermission(permission)}
                />
              ))}
            </div>
          </div>
          <Button variant="primary" type="submit" disabled={isSaving}>
            {isSaving ? '...' : editingKey ? t('rolesSettings.saveRoleButton') : t('rolesSettings.createRoleButton')}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title={t('rolesSettings.deleteRoleTitle')}
        message={pendingDelete ? t('rolesSettings.deleteRoleMessage', { name: pendingDelete.name }) : ''}
        confirmLabel={t('rolesSettings.deleteButton')}
        cancelLabel="Cancel"
        danger
        isConfirming={isDeleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
