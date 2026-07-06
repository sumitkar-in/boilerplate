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

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key varchar(32) NOT NULL UNIQUE,
  project_id uuid NOT NULL REFERENCES task_projects(id),
  title varchar(255) NOT NULL,
  description text NOT NULL DEFAULT '',
  type varchar(24) NOT NULL DEFAULT 'task',
  status varchar(32) NOT NULL DEFAULT 'todo',
  priority varchar(24) NOT NULL DEFAULT 'medium',
  primary_assignee_id uuid,
  assignee_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  watcher_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  due_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (status);
CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks (project_id);
CREATE INDEX IF NOT EXISTS tasks_priority_idx ON tasks (priority);
CREATE INDEX IF NOT EXISTS tasks_type_idx ON tasks (type);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks (created_at DESC);

CREATE TABLE IF NOT EXISTS task_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key varchar(64) NOT NULL UNIQUE,
  label varchar(255) NOT NULL,
  type varchar(16) NOT NULL DEFAULT 'text',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_user_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_user_id uuid,
  action varchar(64) NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
