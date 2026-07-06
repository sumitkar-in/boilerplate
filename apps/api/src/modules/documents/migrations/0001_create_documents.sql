CREATE TABLE IF NOT EXISTS doc_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(32) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES doc_spaces(id) ON DELETE CASCADE,
  parent_id uuid,
  title varchar(255) NOT NULL,
  slug varchar(255) NOT NULL,
  format varchar(24) NOT NULL DEFAULT 'markdown',
  content text NOT NULL DEFAULT '',
  version varchar(32) NOT NULL DEFAULT '1',
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_pages_space_idx ON document_pages (space_id);
CREATE INDEX IF NOT EXISTS document_pages_parent_idx ON document_pages (parent_id);
CREATE INDEX IF NOT EXISTS document_pages_updated_at_idx ON document_pages (updated_at DESC);

CREATE TABLE IF NOT EXISTS document_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES document_pages(id) ON DELETE CASCADE,
  author_user_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES document_pages(id) ON DELETE CASCADE,
  version varchar(32) NOT NULL,
  title varchar(255) NOT NULL,
  format varchar(24) NOT NULL,
  content text NOT NULL,
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  saved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
