import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const EVENT_TYPES = ['meeting', 'event', 'reminder', 'block'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_STATUS = ['confirmed', 'tentative', 'cancelled'] as const;
export type EventStatus = (typeof EVENT_STATUS)[number];

export const EVENT_VISIBILITY = ['public', 'private'] as const;
export type EventVisibility = (typeof EVENT_VISIBILITY)[number];

export const calendarEvent = pgTable(
  'calendar_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** The user who owns this event */
    ownerUserId: uuid('owner_user_id').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull().default(''),
    type: varchar('type', { length: 24 })
      .notNull()
      .default('event')
      .$type<EventType>(),
    status: varchar('status', { length: 24 })
      .notNull()
      .default('confirmed')
      .$type<EventStatus>(),
    visibility: varchar('visibility', { length: 24 })
      .notNull()
      .default('private')
      .$type<EventVisibility>(),
    /** ISO-8601 start datetime string (stored with tz) */
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    allDay: boolean('all_day').notNull().default(false),
    /** Optional location string */
    location: varchar('location', { length: 512 }).notNull().default(''),
    /** Meeting link for online meetings */
    meetingLink: varchar('meeting_link', { length: 1024 })
      .notNull()
      .default(''),
    /** Recurrence rule (RRULE string, e.g. FREQ=WEEKLY;BYDAY=MO,WE) */
    rrule: varchar('rrule', { length: 1024 }),
    /** uid for ICS compat — kept stable across imports/exports */
    icsUid: varchar('ics_uid', { length: 512 }),
    /** Colour override (hex) */
    color: varchar('color', { length: 32 }),
    /** Extra metadata from import */
    metadata: jsonb('metadata')
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('cal_events_owner_idx').on(table.ownerUserId),
    index('cal_events_start_idx').on(table.startAt),
    index('cal_events_end_idx').on(table.endAt),
  ],
);
