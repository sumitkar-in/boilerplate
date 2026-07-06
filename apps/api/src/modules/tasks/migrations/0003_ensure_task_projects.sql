CREATE TABLE IF NOT EXISTS task_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL,
  code varchar(12) NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_projects_name_idx ON task_projects (name);
CREATE INDEX IF NOT EXISTS task_projects_code_idx ON task_projects (code);

INSERT INTO task_projects (name, code, description)
VALUES ('Default', 'TASK', 'Default project for tasks created before projects were introduced.')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS project_id uuid;

UPDATE tasks
SET project_id = (SELECT id FROM task_projects WHERE code = 'TASK' LIMIT 1)
WHERE project_id IS NULL;

ALTER TABLE tasks
  ALTER COLUMN project_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_project_id_task_projects_id_fk'
      AND conrelid = 'tasks'::regclass
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_project_id_task_projects_id_fk
      FOREIGN KEY (project_id) REFERENCES task_projects(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks (project_id);
CREATE INDEX IF NOT EXISTS tasks_project_status_updated_idx
  ON tasks (project_id, status, updated_at DESC);
