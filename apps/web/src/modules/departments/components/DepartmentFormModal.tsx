import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Modal, Textarea, useToast } from '@boilerplate/ui-common';
import type { Department, DepartmentInput } from '../api';

type DepartmentFormModalProps = {
  isOpen: boolean;
  department: Department | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: DepartmentInput) => void;
};

export function DepartmentFormModal({
  isOpen,
  department,
  isSubmitting,
  onClose,
  onSubmit,
}: DepartmentFormModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Re-seed the fields whenever the modal (re)opens for a different target —
  // render-phase state adjustment instead of an effect, per React guidance.
  const formKey = isOpen ? (department?.id ?? 'new') : null;
  const [seededKey, setSeededKey] = useState(formKey);
  if (formKey !== seededKey) {
    setSeededKey(formKey);
    if (formKey !== null) {
      setName(department?.name ?? '');
      setDescription(department?.description ?? '');
    }
  }

  function handleSave() {
    if (!name.trim()) {
      showToast(t('departments.validationRequired'), 'error');
      return;
    }
    onSubmit({ name: name.trim(), description: description.trim() || undefined });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={department ? t('departments.editModalTitle') : t('departments.createModalTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {t('departments.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? t('departments.saving') : t('departments.save')}
          </Button>
        </>
      }
    >
      <Input
        label={t('departments.nameLabel')}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={t('departments.namePlaceholder')}
        required
      />
      <Textarea
        label={t('departments.descriptionLabel')}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder={t('departments.descriptionPlaceholder')}
        rows={3}
      />
    </Modal>
  );
}
