import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Trash2 } from 'lucide-react';
import { Button, type AdvancedTableColumn, type AdvancedTableEditType } from '@boilerplate/ui-common';
import type { Department } from '../../departments/api';
import type { Employee, EmployeeCustomField } from '../api';

export type EmployeeColumnKind = 'builtin' | 'custom' | 'actions';
export type EmployeeColumn = AdvancedTableColumn<Employee> & { kind: EmployeeColumnKind };

const editTypeByFieldType: Record<EmployeeCustomField['type'], AdvancedTableEditType> = {
  text: 'text',
  number: 'number',
  date: 'date',
  select: 'select',
};

export function useEmployeeColumns({
  departments,
  departmentsEnabled,
  customFields,
  employees,
  onEdit,
  onDelete,
}: {
  departments: Department[];
  departmentsEnabled: boolean;
  customFields: EmployeeCustomField[];
  employees: Employee[];
  onEdit: (row: Employee) => void;
  onDelete: (row: Employee) => void;
}): EmployeeColumn[] {
  const { t } = useTranslation();

  return useMemo<EmployeeColumn[]>(() => {
    const departmentNames = new Map(departments.map((department) => [department.id, department.name]));
    const departmentOptions = [
      { label: t('employees.noDepartment'), value: '' },
      ...departments.map((department) => ({ label: department.name, value: department.id })),
    ];

    const employeeNames = new Map(employees.map((emp) => [emp.id, emp.name]));
    const managerOptions = [
      { label: t('employees.noManager'), value: '' },
      ...employees.map((emp) => ({ label: emp.name, value: emp.id })),
    ];

    return [
      {
        key: 'name',
        title: t('employees.columnName'),
        kind: 'builtin',
        editable: true,
        getValue: (row) => row.name,
        render: (row) => <strong>{row.name}</strong>,
      },
      { key: 'phone', title: t('employees.columnPhone'), kind: 'builtin', editable: true, editType: 'tel', getValue: (row) => row.phone },
      { key: 'email', title: t('employees.columnEmail'), kind: 'builtin', editable: true, editType: 'email', getValue: (row) => row.email },
      {
        key: 'manager',
        title: t('employees.columnManager'),
        kind: 'builtin',
        editable: true,
        editType: 'select',
        editOptions: managerOptions,
        getValue: (row) => (row.managerId ? employeeNames.get(row.managerId) ?? '' : ''),
        getEditValue: (row) => row.managerId ?? '',
        // Displays a resolved name but the backend only indexes managerId —
        // no server-side field to filter/sort by the displayed text on.
        filterable: false,
        sortable: false,
      },
      ...(departmentsEnabled
        ? [
            {
              key: 'department',
              title: t('employees.columnDepartment'),
              kind: 'builtin',
              editable: departments.length > 0,
              editType: 'select',
              editOptions: departmentOptions,
              getValue: (row) => (row.departmentId ? departmentNames.get(row.departmentId) ?? '' : ''),
              getEditValue: (row) => row.departmentId ?? '',
              // Same as manager: resolved display text, not a backend field.
              filterable: false,
              sortable: false,
            } satisfies EmployeeColumn,
          ]
        : []),
      ...customFields.map<EmployeeColumn>((field) => ({
        key: `custom:${field.fieldKey}`,
        title: field.label,
        kind: 'custom',
        editable: true,
        editType: editTypeByFieldType[field.type],
        editOptions:
          field.type === 'select'
            ? [{ label: '—', value: '' }, ...field.options.map((option) => ({ label: option, value: option }))]
            : undefined,
        getValue: (row) => row.customFields?.[field.fieldKey] ?? '',
      })),
      {
        key: 'createdAt',
        title: t('employees.columnCreatedAt'),
        kind: 'builtin',
        getValue: (row) => new Date(row.createdAt).toLocaleDateString(),
      },
      {
        key: 'actions',
        title: '',
        kind: 'actions',
        align: 'right',
        width: '106px',
        isAction: true,
        render: (row) => (
          <div className="ui-actions">
            <Button variant="ghost" size="sm" onClick={() => onEdit(row)} title={t('employees.edit')}>
              <Edit2 size={14} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(row)} title={t('employees.delete')}>
              <Trash2 size={14} />
            </Button>
          </div>
        ),
      },
    ];
  }, [customFields, departments, departmentsEnabled, employees, onDelete, onEdit, t]);
}
