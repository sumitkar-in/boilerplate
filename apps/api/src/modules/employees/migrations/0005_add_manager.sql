ALTER TABLE employees DROP COLUMN IF EXISTS manager;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id uuid;

CREATE TABLE IF NOT EXISTS employee_manager_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  old_manager_id uuid,
  new_manager_id uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employee_manager_history_employee_idx ON employee_manager_history (employee_id);
