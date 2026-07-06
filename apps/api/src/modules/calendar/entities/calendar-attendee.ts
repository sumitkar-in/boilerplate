import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { calendarEvent } from './calendar-event';

export const ATTENDEE_STATUS = [
  'pending',
  'accepted',
  'declined',
  'tentative',
] as const;
export type AttendeeStatus = (typeof ATTENDEE_STATUS)[number];

export const calendarAttendee = pgTable(
  'calendar_attendees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => calendarEvent.id, { onDelete: 'cascade' }),
    /** Either a known userId in the tenant or a free-text email */
    userId: uuid('user_id'),
    /** Employee id in the tenant if available */
    employeeId: uuid('employee_id'),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull().default(''),
    status: varchar('status', { length: 24 })
      .notNull()
      .default('pending')
      .$type<AttendeeStatus>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('cal_attendees_event_idx').on(table.eventId),
    index('cal_attendees_user_idx').on(table.userId),
  ],
);
