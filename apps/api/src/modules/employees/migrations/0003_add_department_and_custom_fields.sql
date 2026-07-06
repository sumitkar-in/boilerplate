-- department_id is a soft reference to the departments module's table (no
-- FK: a tenant may enable employees without departments, and module
-- migrations run independently). Missing departments render as unassigned.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id uuid;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS employees_department_id_idx ON employees (department_id);

CREATE TABLE IF NOT EXISTS employee_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key varchar(64) NOT NULL UNIQUE,
  label varchar(255) NOT NULL,
  type varchar(16) NOT NULL DEFAULT 'text',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
