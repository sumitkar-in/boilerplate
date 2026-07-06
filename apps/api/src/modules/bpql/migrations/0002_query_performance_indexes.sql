CREATE INDEX IF NOT EXISTS bpql_rows_table_updated_idx
  ON bpql_rows (table_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS bpql_rows_data_gin_idx
  ON bpql_rows USING GIN (data);
