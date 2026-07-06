import { useTranslation } from 'react-i18next';
import { Button, Modal, Input, Textarea } from '@boilerplate/ui-common';
import type { NoteInput } from '../api';

export function NoteComposer({
  open,
  value,
  isSubmitting,
  onChange,
  onCancel,
  onSave,
}: {
  open: boolean;
  value: NoteInput;
  isSubmitting: boolean;
  onChange: (value: NoteInput) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      title={t('notes.createNote')}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            {t('notes.cancel')}
          </Button>
          <Button variant="primary" onClick={onSave} disabled={isSubmitting}>
            {isSubmitting ? t('notes.saving') : t('notes.save')}
          </Button>
        </>
      }
    >
      <Input
        label={t('notes.titleLabel')}
        value={value.title}
        onChange={(event) => onChange({ ...value, title: event.target.value })}
        placeholder={t('notes.titlePlaceholder')}
      />
      <Textarea
        label={t('notes.contentLabel')}
        value={value.content}
        onChange={(event) => onChange({ ...value, content: event.target.value })}
        rows={6}
        placeholder={t('notes.contentPlaceholder')}
        required
      />
    </Modal>
  );
}
