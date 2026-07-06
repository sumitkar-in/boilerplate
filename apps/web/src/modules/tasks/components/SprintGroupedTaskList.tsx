import { CalendarDays, GripVertical, UserRound } from 'lucide-react';
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import type { Employee } from '../../employees/api';
import type { Task, TaskInput, TaskSprint } from '../api';
import { labelFor, PRIORITIES, STATUSES } from './taskOptions';

const BACKLOG_GROUP_ID = 'backlog';

function sprintGroupId(sprintId: string | null) {
  return `sprint:${sprintId ?? BACKLOG_GROUP_ID}`;
}

function sprintIdFromGroup(groupId: string) {
  const value = groupId.replace(/^sprint:/, '');
  return value === BACKLOG_GROUP_ID ? null : value;
}

function TaskListRow(props: {
  task: Task;
  employeeById: Map<string, Employee>;
  onOpen: (task: Task) => void;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
  } = useDraggable({ id: props.task.id, data: { task: props.task } });
  const assignee = props.employeeById.get(props.task.primaryAssigneeId ?? '');

  return (
    <div
      ref={setNodeRef}
      className="tasks-sprint-row"
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        opacity: isDragging ? 0.62 : 1,
      }}
    >
      <button className="tasks-sprint-row__drag" type="button" {...listeners} {...attributes}>
        <GripVertical size={15} />
      </button>
      <button className="tasks-sprint-row__title" type="button" onClick={() => props.onOpen(props.task)}>
        <strong>{props.task.taskKey}</strong>
        <span>{props.task.title}</span>
      </button>
      <span>{labelFor(STATUSES, props.task.status)}</span>
      <span>{labelFor(PRIORITIES, props.task.priority)}</span>
      <span><UserRound size={13} /> {assignee?.name ?? 'Unassigned'}</span>
    </div>
  );
}

function SprintGroup(props: {
  id: string;
  title: string;
  subtitle: string;
  tasks: Task[];
  employeeById: Map<string, Employee>;
  onOpen: (task: Task) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: props.id });
  return (
    <section
      ref={setNodeRef}
      className={`tasks-sprint-group ${isOver ? 'tasks-sprint-group--over' : ''}`}
    >
      <header>
        <div>
          <strong>{props.title}</strong>
          <small><CalendarDays size={13} /> {props.subtitle}</small>
        </div>
        <span>{props.tasks.length}</span>
      </header>
      <div className="tasks-sprint-group__rows">
        {props.tasks.map((task) => (
          <TaskListRow
            key={task.id}
            task={task}
            employeeById={props.employeeById}
            onOpen={props.onOpen}
          />
        ))}
        {props.tasks.length === 0 ? <p>No tasks in this sprint.</p> : null}
      </div>
    </section>
  );
}

export function SprintGroupedTaskList(props: {
  tasks: Task[];
  sprints: TaskSprint[];
  employeeById: Map<string, Employee>;
  onOpen: (task: Task) => void;
  onMove: (task: Task, patch: Partial<TaskInput>) => void;
}) {
  function handleDragEnd(event: DragEndEvent) {
    const task = props.tasks.find((item) => item.id === String(event.active.id));
    const overId = event.over?.id ? String(event.over.id) : '';
    if (!task || !overId.startsWith('sprint:')) return;
    const sprintId = sprintIdFromGroup(overId);
    if (task.sprintId === sprintId) return;
    props.onMove(task, { sprintId });
  }

  const visibleSprintIds = new Set(props.sprints.map((sprint) => sprint.id));
  const backlogTasks = props.tasks.filter(
    (task) => !task.sprintId || !visibleSprintIds.has(task.sprintId),
  );

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="tasks-sprint-groups">
        {props.sprints.map((sprint) => (
          <SprintGroup
            key={sprint.id}
            id={sprintGroupId(sprint.id)}
            title={sprint.name}
            subtitle={`${sprint.status}${sprint.startDate ? ` · ${new Date(sprint.startDate).toLocaleDateString()}` : ''}${sprint.endDate ? ` - ${new Date(sprint.endDate).toLocaleDateString()}` : ''}`}
            tasks={props.tasks.filter((task) => task.sprintId === sprint.id)}
            employeeById={props.employeeById}
            onOpen={props.onOpen}
          />
        ))}
        <SprintGroup
          id={sprintGroupId(null)}
          title="Backlog"
          subtitle="Tasks not assigned to a sprint"
          tasks={backlogTasks}
          employeeById={props.employeeById}
          onOpen={props.onOpen}
        />
      </div>
    </DndContext>
  );
}
