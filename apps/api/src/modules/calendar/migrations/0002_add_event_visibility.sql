-- Public events are visible to everyone in the tenant.
-- Private events are listed tenant-wide as busy blocks for non-owners.

ALTER TABLE "calendar_events"
  ADD COLUMN IF NOT EXISTS "visibility" varchar(24) NOT NULL DEFAULT 'private';

CREATE INDEX IF NOT EXISTS "cal_events_visibility_idx" ON "calendar_events" ("visibility");
