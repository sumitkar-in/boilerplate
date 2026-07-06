-- Supports the employees.service.ts findAll() query, which always orders by
-- created_at descending. Keep this in sync with entities/employee.ts.
-- See: skills/migrations/SKILL.md
CREATE INDEX IF NOT EXISTS employees_created_at_idx ON employees (created_at DESC);
