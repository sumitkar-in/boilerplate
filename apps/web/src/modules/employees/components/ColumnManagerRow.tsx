import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Edit2, Trash2, X } from 'lucide-react';
import { Button } from '@boilerplate/ui-common';
import type { EmployeeCustomField } from '../api';
import type { EmployeeColumn } from './useEmployeeColumns';

type ColumnManagerRowProps = {
  column: EmployeeColumn;
  // Present only for custom columns — enables rename/delete.
  field?: EmployeeCustomField;
  visible: boolean;
  onToggle: () => void;
  onRename: (id: string, label: string) => Promise<unknown>;
  onRemove: (id: string) => void;
};

export function ColumnManagerRow({ column, field, visible, onToggle, onRename, onRemove }: ColumnManagerRowProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function commitRename() {
    if (!field || draft === null) return;
    const label = draft.trim();
    if (!label || label === field.label) {
      setDraft(null);
      return;
    }
    setIsSaving(true);
    const saved = await onRename(field.id, label);
    setIsSaving(false);
    // Keep the editor open on failure so the typed name isn't lost.
    if (saved !== false) setDraft(null);
  }

  const typeBadge = field
    ? t(`employees.type${field.type.charAt(0).toUpperCase()}${field.type.slice(1)}`)
    : t('employees.builtinBadge');

  return (
    <div className="ecm-row">
      <label className="ecm-switch" title={visible ? t('employees.hideColumn') : t('employees.showColumn')}>
        <input type="checkbox" checked={visible} onChange={onToggle} aria-label={column.title} />
        <span className="ecm-switch__track" aria-hidden="true" />
      </label>

      {draft !== null && field ? (
        <div className="ecm-rename">
          <input
            value={draft}
            autoFocus
            disabled={isSaving}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void commitRename();
              if (event.key === 'Escape') setDraft(null);
            }}
            aria-label={t('employees.renameField')}
          />
          <Button variant="ghost" size="sm" onClick={() => void commitRename()} disabled={isSaving} title={t('employees.save')}>
            <Check size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={isSaving} title={t('employees.cancel')}>
            <X size={14} />
          </Button>
        </div>
      ) : (
        <>
          <span className="ecm-row__title">{column.title}</span>
          <span className={`ecm-badge${field ? ' ecm-badge--custom' : ''}`}>{typeBadge}</span>
          {field && (
            <div className="ecm-row__actions">
              <Button variant="ghost" size="sm" onClick={() => setDraft(field.label)} title={t('employees.renameField')}>
                <Edit2 size={14} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onRemove(field.id)} title={t('employees.removeColumn')}>
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
