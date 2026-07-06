CREATE TABLE IF NOT EXISTS knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  kind varchar(32) NOT NULL,
  content text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_sources_kind_idx ON knowledge_sources (kind);
CREATE INDEX IF NOT EXISTS knowledge_sources_updated_at_idx ON knowledge_sources (updated_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  description text NOT NULL DEFAULT '',
  instruction text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_skills_enabled_idx ON knowledge_skills (enabled);

CREATE TABLE IF NOT EXISTS knowledge_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role varchar(24) NOT NULL,
  content text NOT NULL,
  model varchar(128),
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_chat_messages_created_at_idx ON knowledge_chat_messages (created_at DESC);
