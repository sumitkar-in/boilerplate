import { Settings2 } from 'lucide-react';
import { Button, Input, Modal, SearchableSelect, Select, Textarea } from '@boilerplate/ui-common';
import type { Employee } from '../../employees/api';
import {
  type TaskCustomField,
  type TaskInput,
  type TaskPriority,
  type TaskProject,
  type TaskSprint,
  type TaskStatus,
  type TaskType,
} from '../api';
import { PRIORITIES, STATUSES, toDatetimeLocal, TYPES } from './taskOptions';
import { TaskMultiSelect } from './TaskMultiSelect';

export function TaskModal(props: {
  isOpen: boolean;
  form: TaskInput;
  projects: TaskProject[];
  sprints: TaskSprint[];
  employees: Employee[];
  customFields: TaskCustomField[];
  isSubmitting: boolean;
  onClose: () => void;
  onForm: (value: TaskInput) => void;
  onSave: () => void;
}) {
  const employeeOptions = props.employees.map((employee) => ({ value: employee.id, label: employee.name }));
  const projectCustomFields = props.customFields.filter(
    (field) => field.projectId === props.form.projectId,
  );
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Create task"
      footer={<><Button variant="ghost" onClick={props.onClose}>Cancel</Button><Button variant="primary" onClick={props.onSave} disabled={props.isSubmitting}>{props.isSubmitting ? 'Saving...' : 'Save task'}</Button></>}
    >
      <div className="task-modal-main">
        <Input label="Summary" value={props.form.title} onChange={(event) => props.onForm({ ...props.form, title: event.target.value })} required />
        <Textarea label="Description" value={props.form.description ?? ''} rows={7} onChange={(event) => props.onForm({ ...props.form, description: event.target.value })} />
        <div className="task-modal-row">
          <SearchableSelect label="Project" value={props.form.projectId} options={props.projects.map((project) => ({ value: project.id, label: `${project.name} (${project.code})` }))} onValueChange={(value) => props.onForm({ ...props.form, projectId: value })} />
          <SearchableSelect label="Sprint" value={props.form.sprintId ?? ''} options={[{ value: '', label: 'Backlog' }, ...props.sprints.filter((sprint) => sprint.projectId === props.form.projectId).map((sprint) => ({ value: sprint.id, label: sprint.name }))]} onValueChange={(value) => props.onForm({ ...props.form, sprintId: value || null })} />
          <Select label="Type" value={props.form.type ?? 'task'} options={TYPES.map((item) => ({ value: item.key, label: item.label }))} onChange={(event) => props.onForm({ ...props.form, type: event.target.value as TaskType })} />
          <Select label="Status" value={props.form.status ?? 'todo'} options={STATUSES.map((item) => ({ value: item.key, label: item.label }))} onChange={(event) => props.onForm({ ...props.form, status: event.target.value as TaskStatus })} />
          <Select label="Priority" value={props.form.priority ?? 'medium'} options={PRIORITIES.map((item) => ({ value: item.key, label: item.label }))} onChange={(event) => props.onForm({ ...props.form, priority: event.target.value as TaskPriority })} />
        </div>
        <TaskMultiSelect title="Assignees" employees={props.employees} selected={props.form.assigneeIds ?? []} onChange={(ids) => props.onForm({ ...props.form, assigneeIds: ids, primaryAssigneeId: props.form.primaryAssigneeId ?? ids[0] ?? null })} />
        <SearchableSelect label="Primary assignee" value={props.form.primaryAssigneeId ?? ''} options={[{ value: '', label: 'Unassigned' }, ...employeeOptions]} onValueChange={(value) => props.onForm({ ...props.form, primaryAssigneeId: value || null })} />
        <TaskMultiSelect title="Watchers" employees={props.employees} selected={props.form.watcherIds ?? []} onChange={(ids) => props.onForm({ ...props.form, watcherIds: ids })} />
        <Input label="Labels" value={(props.form.labels ?? []).join(', ')} onChange={(event) => props.onForm({ ...props.form, labels: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="frontend, blocked, Q3" />
        <Input label="Due date" type="datetime-local" value={toDatetimeLocal(props.form.dueDate)} onChange={(event) => props.onForm({ ...props.form, dueDate: event.target.value || null })} />
        {projectCustomFields.length > 0 && (
          <div className="task-custom-fields">
            <h3><Settings2 size={16} /> Custom fields</h3>
            {projectCustomFields.map((field) => (
              <Input key={field.id} label={field.label} value={props.form.customFields?.[field.fieldKey] ?? ''} onChange={(event) => props.onForm({ ...props.form, customFields: { ...(props.form.customFields ?? {}), [field.fieldKey]: event.target.value } })} />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
