import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Clock, FolderKanban, MessageSquare, Settings2, Trash2 } from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  Select,
  Textarea,
  useToast,
} from '@boilerplate/ui-common';
import { listEmployees, type Employee } from '../../employees/api';
import {
  addTaskComment,
  deleteTask,
  getTaskByKey,
  listTaskCustomFields,
  listTaskProjects,
  listTaskSprints,
  updateTask,
  type TaskActivity,
  type TaskComment,
  type TaskCustomField,
  type TaskDetail,
  type TaskInput,
  type TaskPriority,
  type TaskProject,
  type TaskSprint,
  type TaskStatus,
  type TaskType,
} from '../api';
import { PRIORITIES, STATUSES, TYPES } from '../components/taskOptions';
import { TaskMultiSelect } from '../components/TaskMultiSelect';

type ActivityTab = 'all' | 'comments' | 'history';

export function TaskDetailPage() {
  const { taskKey } = useParams<{ taskKey: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [projects, setProjects] = useState<TaskProject[]>([]);
  const [sprints, setSprints] = useState<TaskSprint[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customFields, setCustomFields] = useState<TaskCustomField[]>([]);
  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [labelsDraft, setLabelsDraft] = useState('');
  const [comment, setComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [activityTab, setActivityTab] = useState<ActivityTab>('all');
  const [pendingDelete, setPendingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!taskKey) return;
    try {
      const detail = await getTaskByKey(taskKey);
      setTask(detail);
      setTitleDraft(detail.title);
      setDescriptionDraft(detail.description);
      setLabelsDraft(detail.labels.join(', '));
      setNotFound(false);
    } catch {
      setNotFound(true);
    }
  }, [taskKey]);

  useEffect(() => {
    let cancelled = false;
    if (!taskKey) return;
    getTaskByKey(taskKey).then(
      (detail) => {
        if (cancelled) return;
        setTask(detail);
        setTitleDraft(detail.title);
        setDescriptionDraft(detail.description);
        setLabelsDraft(detail.labels.join(', '));
        setNotFound(false);
      },
      () => {
        if (!cancelled) setNotFound(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [taskKey]);

  useEffect(() => {
    listTaskProjects().then(setProjects, () => setProjects([]));
    listTaskSprints().then(setSprints, () => setSprints([]));
    listTaskCustomFields().then(setCustomFields, () => setCustomFields([]));
    listEmployees({ limit: 500 }).then(
      (result) => setEmployees(result.rows),
      () => setEmployees([]),
    );
  }, []);

  const project = useMemo(
    () => projects.find((item) => item.id === task?.projectId) ?? null,
    [projects, task?.projectId],
  );
  const projectSprints = useMemo(
    () => sprints.filter((sprint) => sprint.projectId === task?.projectId),
    [sprints, task?.projectId],
  );
  const projectCustomFields = useMemo(
    () => customFields.filter((field) => field.projectId === task?.projectId),
    [customFields, task?.projectId],
  );
  const employeeOptions = employees.map((employee) => ({ value: employee.id, label: employee.name }));

  async function patch(input: Partial<TaskInput>) {
    if (!task) return;
    try {
      const updated = await updateTask(task.id, input);
      setTask((current) => (current ? { ...current, ...updated } : current));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update task', 'error');
    }
  }

  function saveTitleIfChanged() {
    if (!task || titleDraft.trim() === task.title || !titleDraft.trim()) {
      setTitleDraft(task?.title ?? '');
      return;
    }
    void patch({ title: titleDraft.trim() });
  }

  function saveDescriptionIfChanged() {
    if (!task || descriptionDraft === task.description) return;
    void patch({ description: descriptionDraft });
  }

  function saveLabelsIfChanged() {
    if (!task) return;
    const next = labelsDraft.split(',').map((item) => item.trim()).filter(Boolean);
    if (JSON.stringify(next) === JSON.stringify(task.labels)) return;
    void patch({ labels: next });
  }

  async function saveComment() {
    if (!task || !comment.trim()) return;
    setIsCommenting(true);
    try {
      await addTaskComment(task.id, comment.trim());
      setComment('');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not add comment', 'error');
    } finally {
      setIsCommenting(false);
    }
  }

  async function confirmDelete() {
    if (!task) return;
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
      showToast('Task deleted', 'success');
      navigate('/tasks');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete task', 'error');
      setIsDeleting(false);
    }
  }

  if (notFound) {
    return (
      <section className="task-detail-page task-detail-page--empty">
        <h1>Task not found</h1>
        <p className="hint-text">"{taskKey}" doesn't exist or you don't have access to it.</p>
        <Link to="/tasks"><Button variant="ghost">Back to tasks</Button></Link>
      </section>
    );
  }

  if (!task) {
    return <section className="task-detail-page task-detail-page--empty" aria-busy="true" />;
  }

  const feedItems: Array<{ id: string; kind: 'comment' | 'activity'; createdAt: string; comment?: TaskComment; activity?: TaskActivity }> = [
    ...task.comments.map((item) => ({ id: item.id, kind: 'comment' as const, createdAt: item.createdAt, comment: item })),
    ...task.activity.map((item) => ({ id: item.id, kind: 'activity' as const, createdAt: item.createdAt, activity: item })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const visibleFeed = activityTab === 'all'
    ? feedItems
    : activityTab === 'comments'
      ? feedItems.filter((item) => item.kind === 'comment')
      : feedItems.filter((item) => item.kind === 'activity');

  return (
    <section className="task-detail-page" aria-label={task.taskKey}>
      <nav className="task-detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/tasks"><FolderKanban size={14} /> Tasks</Link>
        {project && (
          <>
            <ChevronRight size={14} />
            <Link to="/tasks">{project.name} ({project.code})</Link>
          </>
        )}
        <ChevronRight size={14} />
        <span>{task.taskKey}</span>
      </nav>

      <div className="task-detail-layout">
        <main className="task-detail-main">
          <div className="task-detail-titlebar">
            <input
              className="task-detail-title"
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={saveTitleIfChanged}
            />
            <button type="button" className="task-detail-delete" onClick={() => setPendingDelete(true)} aria-label="Delete task">
              <Trash2 size={16} />
            </button>
          </div>

          <div className="task-detail-section">
            <h2>Description</h2>
            <Textarea
              value={descriptionDraft}
              rows={6}
              onChange={(event) => setDescriptionDraft(event.target.value)}
              onBlur={saveDescriptionIfChanged}
              placeholder="Add a description..."
            />
          </div>

          <div className="task-detail-section">
            <div className="task-detail-activity-header">
              <h2>Activity</h2>
              <div className="task-detail-tabs" role="tablist">
                {(['all', 'comments', 'history'] as ActivityTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activityTab === tab}
                    className={activityTab === tab ? 'is-active' : ''}
                    onClick={() => setActivityTab(tab)}
                  >
                    {tab === 'all' ? 'All' : tab === 'comments' ? 'Comments' : 'History'}
                  </button>
                ))}
              </div>
            </div>

            <div className="task-detail-comment-form">
              <Textarea
                value={comment}
                rows={3}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Add a comment..."
              />
              <Button variant="primary" size="sm" onClick={() => void saveComment()} disabled={isCommenting || !comment.trim()}>
                {isCommenting ? 'Posting...' : 'Comment'}
              </Button>
            </div>

            <div className="task-detail-feed">
              {visibleFeed.length === 0 && <p className="hint-text">Nothing here yet.</p>}
              {visibleFeed.map((item) => item.kind === 'comment' ? (
                <div key={item.id} className="task-detail-feed-item">
                  <MessageSquare size={14} />
                  <div>
                    <p>{item.comment!.body}</p>
                    <small>{new Date(item.comment!.createdAt).toLocaleString()}</small>
                  </div>
                </div>
              ) : (
                <div key={item.id} className="task-detail-feed-item task-detail-feed-item--activity">
                  <Clock size={14} />
                  <div>
                    <p><strong>{item.activity!.action}</strong> {item.activity!.message}</p>
                    <small>{new Date(item.activity!.createdAt).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <aside className="task-detail-side">
          <div className={`task-detail-status task-detail-status--${task.status}`}>
            <Select
              value={task.status}
              options={STATUSES.map((item) => ({ value: item.key, label: item.label }))}
              onChange={(event) => void patch({ status: event.target.value as TaskStatus })}
            />
          </div>

          <h3>Details</h3>
          <dl className="task-detail-fields">
            <div>
              <dt>Assignee</dt>
              <dd>
                <Select
                  value={task.primaryAssigneeId ?? ''}
                  options={[{ value: '', label: 'Unassigned' }, ...employeeOptions]}
                  onChange={(event) => void patch({ primaryAssigneeId: event.target.value || null })}
                />
              </dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>
                <Select
                  value={task.type}
                  options={TYPES.map((item) => ({ value: item.key, label: item.label }))}
                  onChange={(event) => void patch({ type: event.target.value as TaskType })}
                />
              </dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>
                <Select
                  value={task.priority}
                  options={PRIORITIES.map((item) => ({ value: item.key, label: item.label }))}
                  onChange={(event) => void patch({ priority: event.target.value as TaskPriority })}
                />
              </dd>
            </div>
            <div>
              <dt>Sprint</dt>
              <dd>
                <Select
                  value={task.sprintId ?? ''}
                  options={[{ value: '', label: 'Backlog' }, ...projectSprints.map((sprint) => ({ value: sprint.id, label: sprint.name }))]}
                  onChange={(event) => void patch({ sprintId: event.target.value || null })}
                />
              </dd>
            </div>
            <div>
              <dt>Labels</dt>
              <dd>
                <input
                  className="task-detail-inline-input"
                  value={labelsDraft}
                  onChange={(event) => setLabelsDraft(event.target.value)}
                  onBlur={saveLabelsIfChanged}
                  placeholder="frontend, blocked, Q3"
                />
              </dd>
            </div>
            <div>
              <dt>Due date</dt>
              <dd>
                <input
                  className="task-detail-inline-input"
                  type="date"
                  value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                  onChange={(event) => void patch({ dueDate: event.target.value ? new Date(event.target.value).toISOString() : null })}
                />
              </dd>
            </div>
            <div>
              <dt>Watchers</dt>
              <dd>
                <TaskMultiSelect
                  title=""
                  employees={employees}
                  selected={task.watcherIds}
                  onChange={(ids) => void patch({ watcherIds: ids })}
                />
              </dd>
            </div>
            {projectCustomFields.map((field) => (
              <div key={field.id}>
                <dt>{field.label}</dt>
                <dd>
                  <input
                    className="task-detail-inline-input"
                    value={task.customFields[field.fieldKey] ?? ''}
                    onChange={(event) => setTask((current) => current ? { ...current, customFields: { ...current.customFields, [field.fieldKey]: event.target.value } } : current)}
                    onBlur={(event) => void patch({ customFields: { ...task.customFields, [field.fieldKey]: event.target.value } })}
                  />
                </dd>
              </div>
            ))}
          </dl>

          <div className="task-detail-meta-footer">
            <Settings2 size={12} />
            <span>Created {new Date(task.createdAt).toLocaleDateString()} · Updated {new Date(task.updatedAt).toLocaleDateString()}</span>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        isOpen={pendingDelete}
        title="Delete task?"
        message={`Delete ${task.taskKey}? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        isConfirming={isDeleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(false)}
      />
    </section>
  );
}
