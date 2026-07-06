CREATE INDEX IF NOT EXISTS employees_updated_at_idx
  ON employees (updated_at DESC);

CREATE INDEX IF NOT EXISTS employees_custom_fields_gin_idx
  ON employees USING GIN (custom_fields);

CREATE INDEX IF NOT EXISTS employee_custom_fields_created_idx
  ON employee_custom_fields (created_at);
