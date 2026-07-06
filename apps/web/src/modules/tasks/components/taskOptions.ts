import type { TaskInput, TaskPriority, TaskStatus, TaskType } from '../api';

export const STATUSES: Array<{ key: TaskStatus; label: string }> = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

export const TYPES: Array<{ key: TaskType; label: string }> = [
  { key: 'task', label: 'Task' },
  { key: 'bug', label: 'Bug' },
  { key: 'story', label: 'Story' },
  { key: 'epic', label: 'Epic' },
  { key: 'subtask', label: 'Subtask' },
];

export const PRIORITIES: Array<{ key: TaskPriority; label: string }> = [
  { key: 'lowest', label: 'Lowest' },
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
  { key: 'urgent', label: 'Urgent' },
];

export const EMPTY_TASK: TaskInput = {
  projectId: '',
  sprintId: null,
  title: '',
  description: '',
  type: 'task',
  status: 'todo',
  priority: 'medium',
  assigneeIds: [],
  watcherIds: [],
  labels: [],
  customFields: {},
  dueDate: null,
};

export function labelFor<T extends string>(items: Array<{ key: T; label: string }>, key: T) {
  return items.find((item) => item.key === key)?.label ?? key;
}

export function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}
