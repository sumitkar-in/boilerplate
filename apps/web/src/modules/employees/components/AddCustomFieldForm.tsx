import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button, Input, Select } from '@boilerplate/ui-common';
import type { EmployeeCustomFieldInput, EmployeeCustomFieldType } from '../api';

type AddCustomFieldFormProps = {
  onAdd: (input: EmployeeCustomFieldInput) => Promise<unknown>;
};

export function AddCustomFieldForm({ onAdd }: AddCustomFieldFormProps) {
  const { t } = useTranslation();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<EmployeeCustomFieldType>('text');
  const [options, setOptions] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  async function handleAdd() {
    if (!label.trim()) return;
    setIsAdding(true);
    const created = await onAdd({
      label: label.trim(),
      type,
      options:
        type === 'select'
          ? options
              .split(',')
              .map((option) => option.trim())
              .filter(Boolean)
          : undefined,
    });
    setIsAdding(false);
    if (created) {
      setLabel('');
      setType('text');
      setOptions('');
    }
  }

  return (
    <div className="ecm-advanced__body">
      <p className="ecm-hint">{t('employees.advancedHint')}</p>
      <div className="ecm-advanced__grid">
        <Input
          label={t('employees.customFieldLabel')}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder={t('employees.customFieldPlaceholder')}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleAdd();
          }}
        />
        <Select
          label={t('employees.customFieldType')}
          value={type}
          onChange={(event) => setType(event.target.value as EmployeeCustomFieldType)}
          options={[
            { label: t('employees.typeText'), value: 'text' },
            { label: t('employees.typeNumber'), value: 'number' },
            { label: t('employees.typeDate'), value: 'date' },
            { label: t('employees.typeSelect'), value: 'select' },
          ]}
        />
      </div>
      {type === 'select' && (
        <Input
          label={t('employees.customFieldOptions')}
          value={options}
          onChange={(event) => setOptions(event.target.value)}
          placeholder={t('employees.customFieldOptionsPlaceholder')}
          helperText={t('employees.customFieldOptionsHint')}
        />
      )}
      <div className="ecm-advanced__submit">
        <Button variant="primary" size="sm" onClick={() => void handleAdd()} disabled={!label.trim() || isAdding}>
          <Plus size={14} />
          {isAdding ? t('employees.saving') : t('employees.addField')}
        </Button>
      </div>
    </div>
  );
}
