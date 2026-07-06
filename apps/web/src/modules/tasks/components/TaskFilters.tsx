import { Filter, Search, UserRound } from 'lucide-react';
import type { Employee } from '../../employees/api';
import type { TaskPriority, TaskStatus, TaskType } from '../api';
import { PRIORITIES, STATUSES, TYPES } from './taskOptions';

export function TaskFilters(props: {
  search: string;
  status: TaskStatus | '';
  type: TaskType | '';
  priority: TaskPriority | '';
  assigneeIds: string[];
  employees: Employee[];
  onSearch: (value: string) => void;
  onStatus: (value: TaskStatus | '') => void;
  onType: (value: TaskType | '') => void;
  onPriority: (value: TaskPriority | '') => void;
  onAssignees: (value: string[]) => void;
  onClear: () => void;
}) {
  const selectedNames = props.employees
    .filter((employee) => props.assigneeIds.includes(employee.id))
    .map((employee) => employee.name);

  return (
    <div className="tasks-filters">
      <label className="tasks-search"><Search size={16} /><input value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder="Search key, summary, description" /></label>
      <select value={props.status} onChange={(event) => props.onStatus(event.target.value as TaskStatus | '')}><option value="">All status</option>{STATUSES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
      <select value={props.type} onChange={(event) => props.onType(event.target.value as TaskType | '')}><option value="">All types</option>{TYPES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
      <select value={props.priority} onChange={(event) => props.onPriority(event.target.value as TaskPriority | '')}><option value="">All priorities</option>{PRIORITIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
      <details className="tasks-assignee-filter">
        <summary><UserRound size={14} /> {selectedNames.length ? selectedNames.join(', ') : 'Any assignee'}</summary>
        <div>
          {props.employees.map((employee) => (
            <label key={employee.id}>
              <input
                type="checkbox"
                checked={props.assigneeIds.includes(employee.id)}
                onChange={(event) => {
                  props.onAssignees(
                    event.target.checked
                      ? [...props.assigneeIds, employee.id]
                      : props.assigneeIds.filter((id) => id !== employee.id),
                  );
                }}
              />
              {employee.name}
            </label>
          ))}
          {props.employees.length === 0 ? <p>No employees</p> : null}
        </div>
      </details>
      <button type="button" onClick={props.onClear}><Filter size={14} /> Clear</button>
    </div>
  );
}
