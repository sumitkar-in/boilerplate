import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Columns3,
  FolderKanban,
  List,
  Plus,
  Settings2,
} from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  SearchableSelect,
  useToast,
} from '@boilerplate/ui-common';
import { listEmployees, type Employee } from '../../employees/api';
import { ProjectSettingsModal } from '../components/ProjectSettingsModal';
import { SprintPage } from '../components/SprintPage';
import { SprintGroupedTaskList } from '../components/SprintGroupedTaskList';
import { TaskBoard } from '../components/TaskBoard';
import { TaskFilters } from '../components/TaskFilters';
import { TaskModal } from '../components/TaskModal';
import { emptySprintForm, sprintToForm, type SprintForm } from '../components/sprintForm';
import { EMPTY_TASK } from '../components/taskOptions';
import {
  createTaskProject,
  createTask,
  createTaskCustomField,
  createTaskSprint,
  deleteTask,
  deleteTaskSprint,
  listTaskCustomFields,
  listTaskProjects,
  listTaskSprints,
  listTasks,
  updateTaskProject,
  updateTask,
  updateTaskSprint,
  type Task,
  type TaskCustomField,
  type TaskCustomFieldType,
  type TaskInput,
  type TaskPriority,
  type TaskProject,
  type TaskSprint,
  type TaskStatus,
  type TaskType,
} from '../api';

type ViewMode = 'kanban' | 'list' | 'sprints';

export function TasksPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [total, setTotal] = useState(0);
  const [projects, setProjects] = useState<TaskProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customFields, setCustomFields] = useState<TaskCustomField[]>([]);
  const [sprints, setSprints] = useState<TaskSprint[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [type, setType] = useState<TaskType | ''>('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [form, setForm] = useState<TaskInput>(EMPTY_TASK);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [pendingSprintDelete, setPendingSprintDelete] = useState<TaskSprint | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingSprint, setIsDeletingSprint] = useState(false);
  const [fieldForm, setFieldForm] = useState<{ label: string; type: TaskCustomFieldType; options: string }>({
    label: '',
    type: 'text',
    options: '',
  });
  const [projectForm, setProjectForm] = useState({ id: '', name: '', code: '', description: '' });
  const [sprintForm, setSprintForm] = useState<SprintForm>(emptySprintForm());

  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const load = useCallback(async () => {
    if (!selectedProjectId) {
      setTasks([]);
      setTotal(0);
      return;
    }
    try {
      const filters = priority
        ? JSON.stringify([{ field: 'priority', operator: 'equals', value: priority }])
        : undefined;
      const result = await listTasks({
        search: search.trim() || undefined,
        projectId: selectedProjectId,
        status: status || undefined,
        type: type || undefined,
        filters,
        limit: 500,
        offset: 0,
        sortBy: 'updatedAt',
        sortDir: 'desc',
      });
      setTasks(result.rows);
      setTotal(result.total);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load tasks', 'error');
    }
  }, [priority, search, selectedProjectId, showToast, status, type]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    listTaskProjects().then(
      (rows) => {
        setProjects(rows);
        setSelectedProjectId((current) => current || rows[0]?.id || '');
        setSprintForm((current) => current.projectId ? current : emptySprintForm(rows[0]?.id || ''));
      },
      () => setProjects([]),
    );
    listEmployees({ limit: 500 }).then(
      (result) => setEmployees(result.rows),
      () => setEmployees([]),
    );
    listTaskCustomFields().then(
      setCustomFields,
      () => setCustomFields([]),
    );
    listTaskSprints().then(
      setSprints,
      () => setSprints([]),
    );
  }, []);

  function openCreate(statusKey: TaskStatus = 'todo') {
    if (!selectedProjectId) {
      setIsProjectSettingsOpen(true);
      showToast('Create a project before adding tasks', 'error');
      return;
    }
    setForm({ ...EMPTY_TASK, projectId: selectedProjectId, status: statusKey });
    setIsTaskModalOpen(true);
  }

  async function saveTask() {
    if (!form.title.trim()) {
      showToast('Task title is required', 'error');
      return;
    }
    if (!form.projectId) {
      showToast('Project is required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await createTask(form);
      showToast('Task saved', 'success');
      setIsTaskModalOpen(false);
      await load();
      navigate(`/task/${created.taskKey}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save task', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function quickUpdate(task: Task, patch: Partial<TaskInput>) {
    try {
      const updated = await updateTask(task.id, patch);
      setTasks((current) => current?.map((item) => (item.id === task.id ? updated : item)) ?? current);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update task', 'error');
    }
  }

  async function saveCustomField() {
    if (!fieldForm.label.trim()) return;
    if (!projectForm.id) {
      showToast('Select a project before adding custom fields', 'error');
      return;
    }
    try {
      const field = await createTaskCustomField({
        projectId: projectForm.id,
        label: fieldForm.label,
        type: fieldForm.type,
        options: fieldForm.type === 'select'
          ? fieldForm.options.split(',').map((item) => item.trim()).filter(Boolean)
          : [],
      });
      setCustomFields((current) => [...current, field]);
      setFieldForm({ label: '', type: 'text', options: '' });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create custom field', 'error');
    }
  }

  async function saveProject() {
    if (!projectForm.name.trim() || !projectForm.code.trim()) {
      showToast('Project name and code are required', 'error');
      return;
    }
    try {
      const input = {
        name: projectForm.name.trim(),
        code: projectForm.code.trim().toUpperCase(),
        description: projectForm.description.trim(),
      };
      const saved = projectForm.id
        ? await updateTaskProject(projectForm.id, input)
        : await createTaskProject(input);
      setProjects((current) => {
        const exists = current.some((project) => project.id === saved.id);
        return exists
          ? current.map((project) => (project.id === saved.id ? saved : project))
          : [...current, saved].sort((a, b) => a.name.localeCompare(b.name));
      });
      setSelectedProjectId(saved.id);
      setProjectForm({ id: '', name: '', code: '', description: '' });
      showToast('Project saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save project', 'error');
    }
  }

  async function saveSprint() {
    if (!sprintForm.projectId || !sprintForm.name.trim()) {
      showToast('Sprint project and name are required', 'error');
      return;
    }
    try {
      const input = {
        projectId: sprintForm.projectId,
        name: sprintForm.name.trim(),
        goal: sprintForm.goal.trim(),
        status: sprintForm.status,
        startDate: sprintForm.startDate || null,
        endDate: sprintForm.endDate || null,
      };
      const saved = sprintForm.id
        ? await updateTaskSprint(sprintForm.id, input)
        : await createTaskSprint(input);
      setSprints((current) => {
        const exists = current.some((sprint) => sprint.id === saved.id);
        return exists
          ? current.map((sprint) => (sprint.id === saved.id ? saved : sprint))
          : [...current, saved].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      });
      setSprintForm(emptySprintForm(selectedProjectId || saved.projectId));
      showToast('Sprint saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save sprint', 'error');
    }
  }

  async function confirmSprintDelete() {
    if (!pendingSprintDelete) return;
    setIsDeletingSprint(true);
    try {
      await deleteTaskSprint(pendingSprintDelete.id);
      setSprints((current) => current.filter((sprint) => sprint.id !== pendingSprintDelete.id));
      setTasks((current) => current?.map((task) => (
        task.sprintId === pendingSprintDelete.id ? { ...task, sprintId: null } : task
      )) ?? current);
      setPendingSprintDelete(null);
      showToast('Sprint deleted', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete sprint', 'error');
    } finally {
      setIsDeletingSprint(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteTask(pendingDelete.id);
      setPendingDelete(null);
      showToast('Task deleted', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete task', 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  const projectSprints = sprints.filter((sprint) => sprint.projectId === selectedProjectId);
  const filteredTasks = (tasks ?? []).filter((task) => {
    if (assigneeIds.length === 0) return true;
    return task.assigneeIds.some((id) => assigneeIds.includes(id));
  });

  return (
    <section className="tasks-page" aria-label="Tasks">
      <div className="tasks-header">
        <div>
          <p className="tasks-eyebrow">Project</p>
          <h1>{selectedProject?.name ?? 'Task management'}</h1>
          <span>{selectedProject ? `${selectedProject.code} project · ` : ''}{total} issues across kanban and list views</span>
        </div>
        <div className="tasks-header__actions">
          <label className="tasks-project-select">
            <FolderKanban size={15} />
            <SearchableSelect
              value={selectedProjectId}
              placeholder="Select project"
              options={[
                { value: '', label: 'Select project' },
                ...projects.map((project) => ({
                  value: project.id,
                  label: `${project.name} (${project.code})`,
                })),
              ]}
              onValueChange={(value) => {
                setSelectedProjectId(value);
                setSprintForm(emptySprintForm(value));
              }}
            />
          </label>
          <Button variant="ghost" onClick={() => setIsProjectSettingsOpen(true)}>
            <Settings2 size={16} /> Projects
          </Button>
          <button className="tasks-view-toggle" aria-pressed={viewMode === 'kanban'} onClick={() => setViewMode('kanban')}>
            <Columns3 size={16} /> Board
          </button>
          <button className="tasks-view-toggle" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}>
            <List size={16} /> List
          </button>
          <button className="tasks-view-toggle" aria-pressed={viewMode === 'sprints'} onClick={() => setViewMode('sprints')}>
            <FolderKanban size={16} /> Sprints
          </button>
          <Button variant="primary" onClick={() => openCreate()}>
            <Plus size={16} /> Create
          </Button>
        </div>
      </div>

      <TaskFilters
        search={search}
        status={status}
        type={type}
        priority={priority}
        assigneeIds={assigneeIds}
        employees={employees}
        onSearch={setSearch}
        onStatus={setStatus}
        onType={setType}
        onPriority={setPriority}
        onAssignees={setAssigneeIds}
        onClear={() => {
          setSearch('');
          setStatus('');
          setType('');
          setPriority('');
          setAssigneeIds([]);
        }}
      />

      {viewMode === 'sprints' ? (
        <SprintPage
          projects={projects}
          selectedProjectId={selectedProjectId}
          sprints={sprints}
          form={sprintForm}
          onForm={setSprintForm}
          onSave={() => void saveSprint()}
          onEdit={(sprint) => setSprintForm(sprintToForm(sprint))}
          onDelete={setPendingSprintDelete}
          onBack={() => setViewMode('kanban')}
        />
      ) : viewMode === 'kanban' ? (
        <TaskBoard
          tasks={filteredTasks}
          employeeById={employeeById}
          onCreate={openCreate}
          onOpen={(task) => navigate(`/task/${task.taskKey}`)}
          onMove={(task, patch) => void quickUpdate(task, patch)}
        />
      ) : (
        <div className="boilerplate-view-container tasks-list-panel">
          <SprintGroupedTaskList
            tasks={filteredTasks}
            sprints={projectSprints}
            employeeById={employeeById}
            onOpen={(task) => navigate(`/task/${task.taskKey}`)}
            onMove={(task, patch) => void quickUpdate(task, patch)}
          />
        </div>
      )}

      <TaskModal
        isOpen={isTaskModalOpen}
        form={form}
        projects={projects}
        sprints={sprints}
        employees={employees}
        customFields={customFields}
        isSubmitting={isSubmitting}
        onClose={() => setIsTaskModalOpen(false)}
        onForm={setForm}
        onSave={() => void saveTask()}
      />

      <ProjectSettingsModal
        isOpen={isProjectSettingsOpen}
        projects={projects}
        form={projectForm}
        customFields={customFields}
        fieldForm={fieldForm}
        onClose={() => setIsProjectSettingsOpen(false)}
        onForm={setProjectForm}
        onFieldForm={setFieldForm}
        onEdit={(project) => setProjectForm({
          id: project.id,
          name: project.name,
          code: project.code,
          description: project.description,
        })}
        onSave={() => void saveProject()}
        onSaveCustomField={() => void saveCustomField()}
      />

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete task?"
        message={pendingDelete ? `Delete ${pendingDelete.taskKey}? This cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        isConfirming={isDeleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        isOpen={pendingSprintDelete !== null}
        title="Delete sprint?"
        message={pendingSprintDelete ? `Delete ${pendingSprintDelete.name}? Tasks will move back to the backlog.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        isConfirming={isDeletingSprint}
        onConfirm={() => void confirmSprintDelete()}
        onCancel={() => setPendingSprintDelete(null)}
      />
    </section>
  );
}
