ALTER TABLE task_custom_fields
  ADD COLUMN IF NOT EXISTS project_id uuid;

UPDATE task_custom_fields
SET project_id = (
  SELECT id
  FROM task_projects
  ORDER BY created_at ASC
  LIMIT 1
)
WHERE project_id IS NULL;

ALTER TABLE task_custom_fields
  ALTER COLUMN project_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_custom_fields_project_id_task_projects_id_fk'
      AND conrelid = 'task_custom_fields'::regclass
  ) THEN
    ALTER TABLE task_custom_fields
      ADD CONSTRAINT task_custom_fields_project_id_task_projects_id_fk
      FOREIGN KEY (project_id) REFERENCES task_projects(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname IN (
      'task_custom_fields_field_key_unique',
      'task_custom_fields_field_key_key'
    )
      AND conrelid = 'task_custom_fields'::regclass
  ) THEN
    ALTER TABLE task_custom_fields
      DROP CONSTRAINT IF EXISTS task_custom_fields_field_key_unique,
      DROP CONSTRAINT IF EXISTS task_custom_fields_field_key_key;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS task_custom_fields_project_created_idx
  ON task_custom_fields (project_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS task_custom_fields_project_field_key_idx
  ON task_custom_fields (project_id, field_key);
