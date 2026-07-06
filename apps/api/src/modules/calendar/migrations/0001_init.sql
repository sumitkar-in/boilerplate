-- Initial migration for the "calendar" module.
-- Applied to every tenant schema that has this feature enabled.

CREATE TABLE IF NOT EXISTS "calendar_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "type" varchar(24) NOT NULL DEFAULT 'event',
  "status" varchar(24) NOT NULL DEFAULT 'confirmed',
  "start_at" timestamp with time zone NOT NULL,
  "end_at" timestamp with time zone NOT NULL,
  "all_day" boolean NOT NULL DEFAULT false,
  "location" varchar(512) NOT NULL DEFAULT '',
  "meeting_link" varchar(1024) NOT NULL DEFAULT '',
  "rrule" varchar(1024),
  "ics_uid" varchar(512),
  "color" varchar(32),
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "cal_events_owner_idx" ON "calendar_events" ("owner_user_id");
CREATE INDEX IF NOT EXISTS "cal_events_start_idx" ON "calendar_events" ("start_at");
CREATE INDEX IF NOT EXISTS "cal_events_end_idx" ON "calendar_events" ("end_at");

CREATE TABLE IF NOT EXISTS "calendar_attendees" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "calendar_events" ("id") ON DELETE CASCADE,
  "user_id" uuid,
  "employee_id" uuid,
  "email" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL DEFAULT '',
  "status" varchar(24) NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "cal_attendees_event_idx" ON "calendar_attendees" ("event_id");
CREATE INDEX IF NOT EXISTS "cal_attendees_user_idx" ON "calendar_attendees" ("user_id");
