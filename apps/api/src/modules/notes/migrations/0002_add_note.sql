-- Adds the "note" table to the notes module.
-- Keep this in sync with entities/note.ts.
-- See: skills/migrations/SKILL.md
CREATE TABLE IF NOT EXISTS note (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       varchar(255) NOT NULL,
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
