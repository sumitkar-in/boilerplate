-- Adds pinned/status/color/labels/reminder metadata to the "note" table.
-- These previously lived client-side only (localStorage), which meant they
-- never synced across devices/browsers. Keep in sync with entities/note.ts.
-- See: skills/migrations/SKILL.md
ALTER TABLE note ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
ALTER TABLE note ADD COLUMN IF NOT EXISTS status varchar(16) NOT NULL DEFAULT 'active';
ALTER TABLE note ADD COLUMN IF NOT EXISTS color varchar(32);
ALTER TABLE note ADD COLUMN IF NOT EXISTS labels jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE note ADD COLUMN IF NOT EXISTS reminder_at timestamptz;

CREATE INDEX IF NOT EXISTS note_status_idx ON note (status);
