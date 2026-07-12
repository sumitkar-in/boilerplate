import { useState } from 'react';
import { Button, Input, Modal, useToast } from '@boilerplate/ui-common';
import type { Visitor, VisitorInput } from '../api';

type VisitorFormModalProps = {
  isOpen: boolean;
  visitor: Visitor | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: VisitorInput) => void;
};

type FormState = {
  name: string;
  phone: string;
  email: string;
  entryTime: string;
};

function getDefaultEntryTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function buildFormState(visitor: Visitor | null): FormState {
  return {
    name: visitor?.name ?? '',
    phone: visitor?.phone ?? '',
    email: visitor?.email ?? '',
    entryTime: visitor?.entryTime ? new Date(visitor.entryTime).toISOString().slice(0, 16) : getDefaultEntryTime(),
  };
}

export function VisitorFormModal({
  isOpen,
  visitor,
  isSubmitting,
  onClose,
  onSubmit,
}: VisitorFormModalProps) {
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(() => buildFormState(visitor));

  const formKey = isOpen ? (visitor?.id ?? 'new') : null;
  const [seededKey, setSeededKey] = useState(formKey);
  if (formKey !== seededKey) {
    setSeededKey(formKey);
    if (formKey !== null) setForm(buildFormState(visitor));
  }

  function handleSave() {
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.entryTime) {
      showToast('All fields are required', 'error');
      return;
    }
    onSubmit({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      entryTime: new Date(form.entryTime).toISOString(),
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={visitor ? 'Edit Visitor' : 'Create Visitor'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Visitor'}
          </Button>
        </>
      }
    >
      <Input
        label="Name"
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        placeholder="Ada Lovelace"
        required
      />
      <Input
        label="Phone"
        value={form.phone}
        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
        placeholder="+15551234567"
        required
      />
      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
        placeholder="person@example.com"
        required
      />
      <Input
        label="Entry Time"
        type="datetime-local"
        value={form.entryTime}
        onChange={(e) => setForm((p) => ({ ...p, entryTime: e.target.value }))}
        required
      />
    </Modal>
  );
}
