import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Modal, SearchableSelect, Select, useToast } from '@boilerplate/ui-common';
import type { Department } from '../../departments/api';
import type { Employee, EmployeeCustomField, EmployeeInput } from '../api';

type EmployeeFormModalProps = {
  isOpen: boolean;
  employee: Employee | null;
  departments: Department[];
  departmentsEnabled: boolean;
  employees: Employee[];
  customFields: EmployeeCustomField[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: EmployeeInput) => void;
};

type FormState = {
  name: string;
  phone: string;
  email: string;
  departmentId: string;
  managerId: string;
  customFields: Record<string, string>;
};

function buildFormState(employee: Employee | null, customFields: EmployeeCustomField[]): FormState {
  return {
    name: employee?.name ?? '',
    phone: employee?.phone ?? '',
    email: employee?.email ?? '',
    departmentId: employee?.departmentId ?? '',
    managerId: employee?.managerId ?? '',
    customFields: Object.fromEntries(
      customFields.map((field) => [field.fieldKey, employee?.customFields?.[field.fieldKey] ?? '']),
    ),
  };
}

const inputTypeByFieldType = { text: 'text', number: 'number', date: 'date' } as const;

export function EmployeeFormModal({
  isOpen,
  employee,
  departments,
  departmentsEnabled,
  employees: allEmployees,
  customFields,
  isSubmitting,
  onClose,
  onSubmit,
}: EmployeeFormModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(() => buildFormState(employee, customFields));

  const employees = employee ? allEmployees.filter((emp) => emp.id !== employee.id) : allEmployees;

  // Re-seed the form whenever the modal (re)opens for a different target —
  // render-phase state adjustment instead of an effect, per React guidance.
  const formKey = isOpen ? (employee?.id ?? 'new') : null;
  const [seededKey, setSeededKey] = useState(formKey);
  if (formKey !== seededKey) {
    setSeededKey(formKey);
    if (formKey !== null) setForm(buildFormState(employee, customFields));
  }

  function setCustomValue(fieldKey: string, value: string) {
    setForm((current) => ({
      ...current,
      customFields: { ...current.customFields, [fieldKey]: value },
    }));
  }

  function handleSave() {
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      showToast(t('employees.validationRequired'), 'error');
      return;
    }
    onSubmit({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      departmentId: form.departmentId || null,
      managerId: form.managerId || null,
      customFields: form.customFields,
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employee ? t('employees.editModalTitle') : t('employees.createModalTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {t('employees.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? t('employees.saving') : t('employees.save')}
          </Button>
        </>
      }
    >
      <Input
        label={t('employees.nameLabel')}
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        placeholder={t('employees.namePlaceholder')}
        required
      />
      <Input
        label={t('employees.phoneLabel')}
        value={form.phone}
        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
        placeholder={t('employees.phonePlaceholder')}
        required
      />
      <Input
        label={t('employees.emailLabel')}
        type="email"
        value={form.email}
        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
        placeholder={t('employees.emailPlaceholder')}
        required
      />
      <SearchableSelect
        label={t('employees.managerLabel')}
        value={form.managerId}
        onValueChange={(value) => setForm((p) => ({ ...p, managerId: value }))}
        placeholder={t('employees.noManager')}
        options={[
          { label: t('employees.noManager'), value: '' },
          ...employees.map((emp) => ({ label: emp.name, value: emp.id })),
        ]}
      />
      {departmentsEnabled && (
        <SearchableSelect
          label={t('employees.departmentLabel')}
          value={form.departmentId}
          onValueChange={(value) => setForm((p) => ({ ...p, departmentId: value }))}
          placeholder={t('employees.noDepartment')}
          options={[
            { label: t('employees.noDepartment'), value: '' },
            ...departments.map((department) => ({ label: department.name, value: department.id })),
          ]}
        />
      )}
      {customFields.length > 0 && (
        <div className="employee-custom-form">
          <div className="employee-custom-form__title">{t('employees.customFieldsTitle')}</div>
          {customFields.map((field) =>
            field.type === 'select' ? (
              <Select
                key={field.id}
                label={field.label}
                value={form.customFields[field.fieldKey] ?? ''}
                onChange={(event) => setCustomValue(field.fieldKey, event.target.value)}
                options={[
                  { label: '—', value: '' },
                  ...field.options.map((option) => ({ label: option, value: option })),
                ]}
              />
            ) : (
              <Input
                key={field.id}
                label={field.label}
                type={inputTypeByFieldType[field.type]}
                value={form.customFields[field.fieldKey] ?? ''}
                onChange={(event) => setCustomValue(field.fieldKey, event.target.value)}
              />
            ),
          )}
        </div>
      )}
    </Modal>
  );
}
