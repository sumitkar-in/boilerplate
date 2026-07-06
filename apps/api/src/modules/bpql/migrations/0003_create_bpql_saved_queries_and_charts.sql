CREATE TABLE IF NOT EXISTS bpql_saved_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES bpql_tables(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  description text NOT NULL DEFAULT '',
  search text,
  "where" jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_by varchar(64),
  sort_dir varchar(4),
  columns jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bpql_saved_queries_table_id_idx ON bpql_saved_queries (table_id);

CREATE TABLE IF NOT EXISTS bpql_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES bpql_tables(id) ON DELETE CASCADE,
  saved_query_id uuid REFERENCES bpql_saved_queries(id) ON DELETE SET NULL,
  name varchar(160) NOT NULL,
  description text NOT NULL DEFAULT '',
  chart_type varchar(16) NOT NULL,
  group_by_field varchar(64),
  metric_field varchar(64),
  agg_function varchar(16) NOT NULL DEFAULT 'count',
  search text,
  "where" jsonb NOT NULL DEFAULT '[]'::jsonb,
  group_limit integer NOT NULL DEFAULT 10,
  placement varchar(16) NOT NULL DEFAULT 'bpql',
  "order" integer NOT NULL DEFAULT 0,
  color varchar(32),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bpql_charts_table_id_idx ON bpql_charts (table_id);
CREATE INDEX IF NOT EXISTS bpql_charts_placement_idx ON bpql_charts (placement, "order");
