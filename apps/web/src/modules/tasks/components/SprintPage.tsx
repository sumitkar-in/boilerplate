import { CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { Button, Input, Select, Textarea } from '@boilerplate/ui-common';
import type { TaskProject, TaskSprint, TaskSprintStatus } from '../api';
import { toDateInput, type SprintForm } from './sprintForm';

const SPRINT_STATUSES: Array<{ value: TaskSprintStatus; label: string }> = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
];

export function SprintPage(props: {
  projects: TaskProject[];
  selectedProjectId: string;
  sprints: TaskSprint[];
  form: SprintForm;
  onForm: (value: SprintForm) => void;
  onSave: () => void;
  onEdit: (sprint: TaskSprint) => void;
  onDelete: (sprint: TaskSprint) => void;
  onBack: () => void;
}) {
  const projectOptions = props.projects.map((project) => ({
    value: project.id,
    label: `${project.name} (${project.code})`,
  }));
  const visibleSprints = props.sprints.filter(
    (sprint) => sprint.projectId === props.selectedProjectId,
  );

  return (
    <section className="tasks-sprints-page" aria-label="Task sprints">
      <div className="tasks-sprints-page__form">
        <div>
          <p className="tasks-eyebrow">Sprint planning</p>
          <h2>{props.form.id ? 'Edit sprint' : 'Create sprint'}</h2>
        </div>
        <Select
          label="Project"
          value={props.form.projectId}
          options={projectOptions}
          onChange={(event) => props.onForm({ ...props.form, projectId: event.target.value })}
        />
        <Input label="Sprint name" value={props.form.name} onChange={(event) => props.onForm({ ...props.form, name: event.target.value })} placeholder="Sprint 24.7" />
        <Textarea label="Goal" value={props.form.goal} rows={3} onChange={(event) => props.onForm({ ...props.form, goal: event.target.value })} />
        <div className="task-modal-row">
          <Select label="Status" value={props.form.status} options={SPRINT_STATUSES} onChange={(event) => props.onForm({ ...props.form, status: event.target.value as TaskSprintStatus })} />
          <Input label="Start" type="date" value={props.form.startDate} onChange={(event) => props.onForm({ ...props.form, startDate: event.target.value })} />
          <Input label="End" type="date" value={props.form.endDate} onChange={(event) => props.onForm({ ...props.form, endDate: event.target.value })} />
        </div>
        <div className="tasks-sprints-page__actions">
          <Button variant="ghost" onClick={props.onBack}>Back to board</Button>
          <Button variant="primary" onClick={props.onSave}>{props.form.id ? 'Update sprint' : 'Create sprint'}</Button>
        </div>
      </div>
      <div className="tasks-sprint-list">
        {visibleSprints.map((sprint) => (
          <article key={sprint.id} className={`tasks-sprint-card tasks-sprint-card--${sprint.status}`}>
            <div className="tasks-sprint-card__header">
              <div>
                <strong>{sprint.name}</strong>
                <p>{sprint.goal || 'No sprint goal'}</p>
              </div>
              <span>{sprint.status}</span>
            </div>
            <small><CalendarDays size={13} /> {toDateInput(sprint.startDate) || 'No start'} - {toDateInput(sprint.endDate) || 'No end'}</small>
            <div className="tasks-sprint-card__actions">
              <Button variant="ghost" size="sm" onClick={() => props.onEdit(sprint)}><Pencil size={14} /> Edit</Button>
              <Button variant="ghost" size="sm" onClick={() => props.onDelete(sprint)}><Trash2 size={14} /> Delete</Button>
            </div>
          </article>
        ))}
        {visibleSprints.length === 0 ? <p className="tasks-sprint-empty">No sprints for this project.</p> : null}
      </div>
    </section>
  );
}
