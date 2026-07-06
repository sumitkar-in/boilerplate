import { Button, Input, Modal, SearchableSelect } from '@boilerplate/ui-common';
import type { BpqlFieldDefinition, BpqlRowData, BpqlTable } from '../api';

export function RowModal({ isOpen, table, value, isSubmitting, onClose, onChange, onSave }: {
  isOpen: boolean;
  table: BpqlTable | null;
  value: BpqlRowData;
  isSubmitting: boolean;
  onClose: () => void;
  onChange: (value: BpqlRowData) => void;
  onSave: () => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={table ? `${table.name} row` : 'BPQL row'}
      maxWidth="760px"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={onSave} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save row'}</Button></>}
    >
      <div className="bpql-form">
        {table?.fields.map((field) => (
          <BpqlFieldInput
            key={field.key}
            field={field}
            value={value[field.key]}
            onChange={(fieldValue) => onChange({ ...value, [field.key]: fieldValue })}
          />
        ))}
      </div>
    </Modal>
  );
}

function BpqlFieldInput({ field, value, onChange }: {
  field: BpqlFieldDefinition;
  value: string | number | boolean | null | undefined;
  onChange: (value: string | number | boolean | null) => void;
}) {
  if (field.type === 'boolean') {
    return (
      <label className="bpql-check">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        {field.label}
      </label>
    );
  }
  if (field.type === 'select') {
    return <SearchableSelect label={field.label} value={String(value ?? '')} options={[{ value: '', label: 'Select' }, ...(field.options ?? []).map((item) => ({ value: item, label: item }))]} onValueChange={onChange} />;
  }
  return <Input label={field.label} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} />;
}
