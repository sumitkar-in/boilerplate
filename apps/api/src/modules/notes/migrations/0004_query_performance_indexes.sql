CREATE INDEX IF NOT EXISTS note_updated_at_idx
  ON note (updated_at DESC);

CREATE INDEX IF NOT EXISTS note_title_idx
  ON note (title);
