CREATE INDEX IF NOT EXISTS doc_spaces_name_idx
  ON doc_spaces (name);

CREATE INDEX IF NOT EXISTS document_pages_space_updated_idx
  ON document_pages (space_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS document_pages_labels_gin_idx
  ON document_pages USING GIN (labels);

CREATE INDEX IF NOT EXISTS document_comments_page_created_idx
  ON document_comments (page_id, created_at);

CREATE INDEX IF NOT EXISTS document_revisions_page_created_idx
  ON document_revisions (page_id, created_at);
