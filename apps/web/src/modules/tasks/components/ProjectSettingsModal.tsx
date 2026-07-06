import { Settings2 } from 'lucide-react';
import { Button, Input, Modal, Select, Textarea } from '@boilerplate/ui-common';
import type { TaskCustomField, TaskCustomFieldType, TaskProject } from '../api';

export function ProjectSettingsModal(props: {
  isOpen: boolean;
  projects: TaskProject[];
  form: { id: string; name: string; code: string; description: string };
  customFields: TaskCustomField[];
  fieldForm: { label: string; type: TaskCustomFieldType; options: string };
  onClose: () => void;
  onForm: (value: { id: string; name: string; code: string; description: string }) => void;
  onFieldForm: (value: { label: string; type: TaskCustomFieldType; options: string }) => void;
  onEdit: (project: TaskProject) => void;
  onSave: () => void;
  onSaveCustomField: () => void;
}) {
  const projectCustomFields = props.customFields.filter((field) => field.projectId === props.form.id);
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Task projects"
      footer={<><Button variant="ghost" onClick={props.onClose}>Close</Button><Button variant="primary" onClick={props.onSave}>{props.form.id ? 'Update project' : 'Add project'}</Button></>}
    >
      <div className="task-project-settings">
        <div className="task-project-settings__form">
          <Input label="Project name" value={props.form.name} onChange={(event) => props.onForm({ ...props.form, name: event.target.value })} placeholder="Website Services" />
          <Input label="Project code" value={props.form.code} onChange={(event) => props.onForm({ ...props.form, code: event.target.value.toUpperCase() })} placeholder="WS" />
          <Textarea label="Description" value={props.form.description} rows={3} onChange={(event) => props.onForm({ ...props.form, description: event.target.value })} />
        </div>
        <div className="task-project-list">
          {props.projects.map((project) => (
            <button key={project.id} type="button" onClick={() => props.onEdit(project)}>
              <strong>{project.name}</strong>
              <span>{project.code}</span>
              <small>{project.description || 'No description'}</small>
            </button>
          ))}
          {props.projects.length === 0 ? <p>No projects yet. Add one to start creating tasks.</p> : null}
        </div>
        {props.form.id && (
          <div className="task-custom-fields">
            <h3><Settings2 size={16} /> Custom fields for {props.form.name || 'this project'}</h3>
            {projectCustomFields.map((field) => (
              <p key={field.id}>{field.label} <small>({field.type})</small></p>
            ))}
            <div className="task-modal-row">
              <Input label="New field" value={props.fieldForm.label} onChange={(event) => props.onFieldForm({ ...props.fieldForm, label: event.target.value })} />
              <Select label="Type" value={props.fieldForm.type} options={[{ value: 'text', label: 'Text' }, { value: 'number', label: 'Number' }, { value: 'date', label: 'Date' }, { value: 'select', label: 'Select' }]} onChange={(event) => props.onFieldForm({ ...props.fieldForm, type: event.target.value as TaskCustomFieldType })} />
              <Input label="Options" value={props.fieldForm.options} onChange={(event) => props.onFieldForm({ ...props.fieldForm, options: event.target.value })} placeholder="Comma-separated" />
              <Button variant="ghost" onClick={props.onSaveCustomField}>Add</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
