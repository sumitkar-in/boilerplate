import type { Employee } from '../../employees/api';

export function TaskMultiSelect({ title, employees, selected, onChange }: {
  title: string;
  employees: Employee[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const selectedSet = new Set(selected);
  return (
    <div className="task-people-picker">
      <strong>{title}</strong>
      <div>
        {employees.map((employee) => (
          <label key={employee.id} className="checkbox-row">
            <input
              type="checkbox"
              checked={selectedSet.has(employee.id)}
              onChange={(event) => {
                onChange(event.target.checked
                  ? [...selected, employee.id]
                  : selected.filter((id) => id !== employee.id));
              }}
            />
            <span>{employee.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
