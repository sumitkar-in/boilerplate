-- Supports the notes.service.ts findAll() query, which always orders by
-- created_at descending. Keep this in sync with entities/note.ts.
-- See: skills/migrations/SKILL.md
CREATE INDEX IF NOT EXISTS note_created_at_idx ON note (created_at DESC);
