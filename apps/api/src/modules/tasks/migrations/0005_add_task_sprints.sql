CREATE TABLE IF NOT EXISTS task_sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES task_projects(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  goal text NOT NULL DEFAULT '',
  status varchar(24) NOT NULL DEFAULT 'planned',
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_sprints_project_status_idx
  ON task_sprints (project_id, status);

CREATE INDEX IF NOT EXISTS task_sprints_project_dates_idx
  ON task_sprints (project_id, start_date, end_date);

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS sprint_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_sprint_id_task_sprints_id_fk'
      AND conrelid = 'tasks'::regclass
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_sprint_id_task_sprints_id_fk
      FOREIGN KEY (sprint_id) REFERENCES task_sprints(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS tasks_sprint_id_idx ON tasks (sprint_id);
CREATE INDEX IF NOT EXISTS tasks_project_sprint_status_idx
  ON tasks (project_id, sprint_id, status);
