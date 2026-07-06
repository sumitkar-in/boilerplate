import { Bug, UserRound } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import type { Employee } from '../../employees/api';
import type { Task, TaskStatus } from '../api';
import { labelFor, STATUSES, TYPES } from './taskOptions';

export function TaskCard({ task, employeeById, onOpen, onMove }: {
  task: Task;
  employeeById: Map<string, Employee>;
  onOpen: () => void;
  onMove: (status: TaskStatus) => void;
}) {
  const assignee = employeeById.get(task.primaryAssigneeId ?? '');
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
  } = useDraggable({ id: task.id, data: { task } });
  return (
    <article
      ref={setNodeRef}
      className={`task-card task-card--${task.priority}`}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        opacity: isDragging ? 0.62 : 1,
      }}
      {...attributes}
    >
      <div className="task-card__drag" {...listeners} aria-label="Drag task">
        {task.taskKey}
      </div>
      <button type="button" className="task-card__main" onClick={onOpen}>
        <h3>{task.title}</h3>
        <p>{task.description || 'No description'}</p>
      </button>
      <div className="task-card__meta">
        <span><Bug size={12} /> {labelFor(TYPES, task.type)}</span>
        <span><UserRound size={12} /> {assignee?.name ?? 'Unassigned'}</span>
        {task.labels.slice(0, 2).map((item) => <b key={item}>{item}</b>)}
      </div>
      <div className="task-card__move">
        {STATUSES.filter((status) => status.key !== task.status).slice(0, 2).map((status) => (
          <button key={status.key} type="button" onClick={() => onMove(status.key)}>{status.label}</button>
        ))}
      </div>
    </article>
  );
}
