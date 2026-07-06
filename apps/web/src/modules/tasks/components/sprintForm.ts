import type { TaskSprint, TaskSprintStatus } from '../api';

export type SprintForm = {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  status: TaskSprintStatus;
  startDate: string;
  endDate: string;
};

export function emptySprintForm(projectId = ''): SprintForm {
  return {
    id: '',
    projectId,
    name: '',
    goal: '',
    status: 'planned',
    startDate: '',
    endDate: '',
  };
}

export function toDateInput(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function sprintToForm(sprint: TaskSprint): SprintForm {
  return {
    id: sprint.id,
    projectId: sprint.projectId,
    name: sprint.name,
    goal: sprint.goal,
    status: sprint.status,
    startDate: toDateInput(sprint.startDate),
    endDate: toDateInput(sprint.endDate),
  };
}
