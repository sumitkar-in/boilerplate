import { Plus } from 'lucide-react';
import { DndContext, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import type { Employee } from '../../employees/api';
import type { Task, TaskInput, TaskStatus } from '../api';
import { STATUSES } from './taskOptions';
import { TaskCard } from './TaskCard';

function TaskColumn(props: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  employeeById: Map<string, Employee>;
  onCreate: (status: TaskStatus) => void;
  onOpen: (task: Task) => void;
  onMove: (task: Task, patch: Partial<TaskInput>) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: props.status });
  return (
    <section
      ref={setNodeRef}
      className={`tasks-column ${isOver ? 'tasks-column--over' : ''}`}
    >
      <div className="tasks-column__header">
        <strong>{props.label}</strong>
        <span>{props.tasks.length}</span>
        <button type="button" onClick={() => props.onCreate(props.status)}><Plus size={14} /></button>
      </div>
      <div className="tasks-column__body">
        {props.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            employeeById={props.employeeById}
            onOpen={() => props.onOpen(task)}
            onMove={(status) => props.onMove(task, { status })}
          />
        ))}
      </div>
    </section>
  );
}

export function TaskBoard({
  tasks,
  employeeById,
  onCreate,
  onOpen,
  onMove,
}: {
  tasks: Task[];
  employeeById: Map<string, Employee>;
  onCreate: (status: TaskStatus) => void;
  onOpen: (task: Task) => void;
  onMove: (task: Task, patch: Partial<TaskInput>) => void;
}) {
  function handleDragEnd(event: DragEndEvent) {
    const task = tasks.find((item) => item.id === String(event.active.id));
    const nextStatus = event.over?.id ? String(event.over.id) as TaskStatus : null;
    if (!task || !nextStatus || task.status === nextStatus) return;
    if (!STATUSES.some((status) => status.key === nextStatus)) return;
    onMove(task, { status: nextStatus });
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="tasks-board">
        {STATUSES.map((column) => (
          <TaskColumn
            key={column.key}
            status={column.key}
            label={column.label}
            tasks={tasks.filter((task) => task.status === column.key)}
            employeeById={employeeById}
            onCreate={onCreate}
            onOpen={onOpen}
            onMove={onMove}
          />
        ))}
      </div>
    </DndContext>
  );
}
