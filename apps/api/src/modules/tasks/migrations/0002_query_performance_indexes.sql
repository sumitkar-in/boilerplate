CREATE INDEX IF NOT EXISTS tasks_updated_at_idx
  ON tasks (updated_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'tasks'
      AND column_name = 'project_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS tasks_project_status_updated_idx
      ON tasks (project_id, status, updated_at DESC);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS tasks_primary_assignee_idx
  ON tasks (primary_assignee_id);

CREATE INDEX IF NOT EXISTS tasks_assignee_ids_gin_idx
  ON tasks USING GIN (assignee_ids);

CREATE INDEX IF NOT EXISTS tasks_watcher_ids_gin_idx
  ON tasks USING GIN (watcher_ids);

CREATE INDEX IF NOT EXISTS tasks_labels_gin_idx
  ON tasks USING GIN (labels);

CREATE INDEX IF NOT EXISTS task_custom_fields_created_idx
  ON task_custom_fields (created_at);

CREATE INDEX IF NOT EXISTS task_comments_task_created_idx
  ON task_comments (task_id, created_at);

CREATE INDEX IF NOT EXISTS task_activity_task_created_idx
  ON task_activity (task_id, created_at);
