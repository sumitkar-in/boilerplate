import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Select, Textarea } from '@boilerplate/ui-common';
import type { BpqlFieldDefinition, BpqlFieldType, BpqlTableInput } from '../api';

const FIELD_TYPES: Array<{ value: BpqlFieldType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
];

export function TableModal({ isOpen, form, isSubmitting, onClose, onChange, onSave }: {
  isOpen: boolean;
  form: BpqlTableInput;
  isSubmitting: boolean;
  onClose: () => void;
  onChange: (value: BpqlTableInput) => void;
  onSave: () => void;
}) {
  function updateField(index: number, patch: Partial<BpqlFieldDefinition>) {
    onChange({ ...form, fields: form.fields.map((field, i) => i === index ? { ...field, ...patch } : field) });
  }
  function updateFieldType(index: number, type: BpqlFieldType) {
    const field = form.fields[index];
    updateField(index, {
      type,
      options: type === 'select' ? field.options?.length ? field.options : ['Option 1'] : undefined,
    });
  }
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="BPQL table"
      maxWidth="980px"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={onSave} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save table'}</Button></>}
    >
      <div className="bpql-form">
        <div className="bpql-form-row">
          <Input label="Name" value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} placeholder="Website Leads" />
          <Input label="Slug" value={form.slug} onChange={(event) => onChange({ ...form, slug: event.target.value })} placeholder="website-leads" />
        </div>
        <Textarea label="Description" value={form.description ?? ''} rows={3} onChange={(event) => onChange({ ...form, description: event.target.value })} />
        <div className="bpql-field-list">
          <strong>Fields</strong>
          {form.fields.map((field, index) => (
            <div className="bpql-field-row" key={index}>
              <div style={{ gridColumn: 1 }}>
                <Input label="Key" value={field.key} onChange={(event) => updateField(index, { key: event.target.value })} />
              </div>
              <div style={{ gridColumn: 2 }}>
                <Input label="Label" value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} />
              </div>
              <div style={{ gridColumn: 3 }}>
                <Select label="Type" value={field.type} options={FIELD_TYPES} onChange={(event) => updateFieldType(index, event.target.value as BpqlFieldType)} />
              </div>
              {field.type === 'select' && (
                <div style={{ gridColumn: 4 }}>
                  <Input
                    label="Options"
                    value={(field.options ?? []).join(', ')}
                    onChange={(event) => updateField(index, { options: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })}
                    placeholder="New, Qualified, Won"
                  />
                </div>
              )}
              <label className="bpql-check" style={{ gridColumn: 5 }}>
                <input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateField(index, { required: event.target.checked })} />
                Required
              </label>
              <Button style={{ gridColumn: 6 }} variant="ghost" onClick={() => onChange({ ...form, fields: form.fields.filter((_, i) => i !== index) })}><Trash2 size={14} /></Button>
            </div>
          ))}
          <Button variant="ghost" onClick={() => onChange({ ...form, fields: [...form.fields, { key: '', label: '', type: 'text' }] })}>
            <Plus size={16} /> Add field
          </Button>
        </div>
      </div>
    </Modal>
  );
}
