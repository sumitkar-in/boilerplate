CREATE TABLE IF NOT EXISTS bpql_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL,
  slug varchar(80) NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bpql_tables_name_idx ON bpql_tables (name);
CREATE INDEX IF NOT EXISTS bpql_tables_slug_idx ON bpql_tables (slug);

CREATE TABLE IF NOT EXISTS bpql_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES bpql_tables(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bpql_rows_table_id_idx ON bpql_rows (table_id);
CREATE INDEX IF NOT EXISTS bpql_rows_created_at_idx ON bpql_rows (created_at DESC);
