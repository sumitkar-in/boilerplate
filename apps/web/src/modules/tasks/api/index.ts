import { buildQueryString } from '@boilerplate/ui-common';
import { apiFetch } from '../../../core/api-client';

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'lowest' | 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'task' | 'bug' | 'story' | 'epic' | 'subtask';
export type TaskCustomFieldType = 'text' | 'number' | 'date' | 'select';
export type TaskSprintStatus = 'planned' | 'active' | 'closed';

export type TaskProject = {
  id: string;
  name: string;
  code: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  taskKey: string;
  projectId: string;
  sprintId: string | null;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  primaryAssigneeId: string | null;
  assigneeIds: string[];
  watcherIds: string[];
  labels: string[];
  customFields: Record<string, string>;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskComment = {
  id: string;
  taskId: string;
  authorUserId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskActivity = {
  id: string;
  taskId: string;
  actorUserId: string | null;
  action: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type TaskCustomField = {
  id: string;
  projectId: string;
  fieldKey: string;
  label: string;
  type: TaskCustomFieldType;
  options: string[];
  createdAt: string;
  updatedAt: string;
};

export type TaskSprint = {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  status: TaskSprintStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskDetail = Task & {
  comments: TaskComment[];
  activity: TaskActivity[];
  customFieldDefinitions: TaskCustomField[];
};

export type TaskInput = {
  projectId: string;
  sprintId?: string | null;
  title: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  primaryAssigneeId?: string | null;
  assigneeIds?: string[];
  watcherIds?: string[];
  labels?: string[];
  customFields?: Record<string, string>;
  dueDate?: string | null;
};

export type TaskListParams = {
  search?: string;
  projectId?: string;
  sprintId?: string;
  status?: TaskStatus;
  type?: TaskType;
  assigneeId?: string;
  watcherId?: string;
  label?: string;
  // JSON-encoded ListFilter[] — see toListFilters()/encodeListFilters() in @boilerplate/ui-common.
  filters?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

export type TaskListResult = {
  rows: Task[];
  total: number;
  limit: number;
  offset: number;
};

export function listTasks(params: TaskListParams = {}): Promise<TaskListResult> {
  return apiFetch<TaskListResult>(`/tasks${buildQueryString(params)}`);
}

export function listTaskProjects(): Promise<TaskProject[]> {
  return apiFetch<TaskProject[]>('/tasks/projects');
}

export function createTaskProject(input: {
  name: string;
  code: string;
  description?: string;
}): Promise<TaskProject> {
  return apiFetch<TaskProject>('/tasks/projects', { method: 'POST', body: input });
}

export function updateTaskProject(
  id: string,
  input: Partial<{ name: string; code: string; description: string }>,
): Promise<TaskProject> {
  return apiFetch<TaskProject>(`/tasks/projects/${id}`, { method: 'PATCH', body: input });
}

export function listTaskSprints(projectId?: string): Promise<TaskSprint[]> {
  return apiFetch<TaskSprint[]>(`/tasks/sprints${buildQueryString({ projectId })}`);
}

export function createTaskSprint(input: {
  projectId: string;
  name: string;
  goal?: string;
  status?: TaskSprintStatus;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<TaskSprint> {
  return apiFetch<TaskSprint>('/tasks/sprints', { method: 'POST', body: input });
}

export function updateTaskSprint(
  id: string,
  input: Partial<{
    projectId: string;
    name: string;
    goal: string;
    status: TaskSprintStatus;
    startDate: string | null;
    endDate: string | null;
  }>,
): Promise<TaskSprint> {
  return apiFetch<TaskSprint>(`/tasks/sprints/${id}`, { method: 'PATCH', body: input });
}

export function deleteTaskSprint(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/tasks/sprints/${id}`, { method: 'DELETE' });
}

export function getTask(id: string): Promise<TaskDetail> {
  return apiFetch<TaskDetail>(`/tasks/${id}`);
}

export function getTaskByKey(taskKey: string): Promise<TaskDetail> {
  return apiFetch<TaskDetail>(`/tasks/by-key/${encodeURIComponent(taskKey)}`);
}

export function createTask(input: TaskInput): Promise<Task> {
  return apiFetch<Task>('/tasks', { method: 'POST', body: input });
}

export function updateTask(id: string, input: Partial<TaskInput>): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}`, { method: 'PATCH', body: input });
}

export function deleteTask(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/tasks/${id}`, { method: 'DELETE' });
}

export function addTaskComment(id: string, body: string): Promise<TaskComment> {
  return apiFetch<TaskComment>(`/tasks/${id}/comments`, { method: 'POST', body: { body } });
}

export function listTaskCustomFields(projectId?: string): Promise<TaskCustomField[]> {
  return apiFetch<TaskCustomField[]>(
    `/tasks/custom-fields${buildQueryString({ projectId })}`,
  );
}

export function createTaskCustomField(input: {
  projectId: string;
  label: string;
  type?: TaskCustomFieldType;
  options?: string[];
}): Promise<TaskCustomField> {
  return apiFetch<TaskCustomField>('/tasks/custom-fields', { method: 'POST', body: input });
}

export function updateTaskCustomField(
  id: string,
  input: Partial<{ label: string; type: TaskCustomFieldType; options: string[] }>,
): Promise<TaskCustomField> {
  return apiFetch<TaskCustomField>(`/tasks/custom-fields/${id}`, { method: 'PATCH', body: input });
}

export function deleteTaskCustomField(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/tasks/custom-fields/${id}`, { method: 'DELETE' });
}
