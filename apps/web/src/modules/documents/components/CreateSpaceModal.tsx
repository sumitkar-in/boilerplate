import { Button, Input, Modal, Textarea } from '@boilerplate/ui-common';

export type SpaceForm = { key: string; name: string; description: string };

export function CreateSpaceModal({ isOpen, form, onChange, onClose, onSave }: {
  isOpen: boolean;
  form: SpaceForm;
  onChange: (form: SpaceForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create space"
      maxWidth="720px"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onSave}>Create</Button>
        </>
      )}
    >
      <Input label="Key" value={form.key} onChange={(event) => onChange({ ...form, key: event.target.value.toUpperCase() })} placeholder="ENG" />
      <Input label="Name" value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} placeholder="Engineering" />
      <Textarea label="Description" value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} rows={3} />
    </Modal>
  );
}
