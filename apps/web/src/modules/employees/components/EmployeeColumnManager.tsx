import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import { Button, Modal } from '@boilerplate/ui-common';
import type { EmployeeCustomField, EmployeeCustomFieldInput } from '../api';
import { AddCustomFieldForm } from './AddCustomFieldForm';
import { ColumnManagerRow } from './ColumnManagerRow';
import type { EmployeeColumn } from './useEmployeeColumns';

type EmployeeColumnManagerProps = {
  isOpen: boolean;
  columns: EmployeeColumn[];
  visibleColumns: string[];
  customFields: EmployeeCustomField[];
  onClose: () => void;
  onToggleColumn: (columnKey: string) => void;
  onShowAll: () => void;
  onAddField: (input: EmployeeCustomFieldInput) => Promise<unknown>;
  onRenameField: (id: string, label: string) => Promise<unknown>;
  onRemoveField: (id: string) => void;
};

export function EmployeeColumnManager({
  isOpen,
  columns,
  visibleColumns,
  customFields,
  onClose,
  onToggleColumn,
  onShowAll,
  onAddField,
  onRenameField,
  onRemoveField,
}: EmployeeColumnManagerProps) {
  const { t } = useTranslation();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const dataColumns = columns.filter((column) => column.kind !== 'actions');
  const visibleCount = dataColumns.filter((column) => visibleColumns.includes(column.key)).length;
  const fieldByColumnKey = new Map(customFields.map((field) => [`custom:${field.fieldKey}`, field]));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('employees.manageColumns')}
      maxWidth="760px"
      footer={
        <Button variant="primary" onClick={onClose}>
          {t('employees.done')}
        </Button>
      }
    >
      <div className="employee-column-manager">
        <div className="ecm-section-head">
          <span className="ecm-section-head__title">
            {t('employees.visibleCount', { visible: visibleCount, total: dataColumns.length })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowAll}
            disabled={visibleCount === dataColumns.length}
          >
            {t('employees.showAll')}
          </Button>
        </div>

        <div className="ecm-list" aria-label={t('employees.availableColumns')}>
          {dataColumns.map((column) => (
            <ColumnManagerRow
              key={column.key}
              column={column}
              field={fieldByColumnKey.get(column.key)}
              visible={visibleColumns.includes(column.key)}
              onToggle={() => onToggleColumn(column.key)}
              onRename={onRenameField}
              onRemove={onRemoveField}
            />
          ))}
        </div>

        <div className="ecm-advanced">
          <button
            type="button"
            className="ecm-advanced__toggle"
            onClick={() => setIsAdvancedOpen((open) => !open)}
            aria-expanded={isAdvancedOpen}
          >
            {isAdvancedOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            <Settings2 size={14} />
            <span>{t('employees.advancedToggle')}</span>
          </button>
          {isAdvancedOpen && <AddCustomFieldForm onAdd={onAddField} />}
        </div>
      </div>
    </Modal>
  );
}
