import {
  boolean,
  index,
  jsonb,
  pgTable,
  uuid,
  timestamp,
  varchar,
  text,
} from 'drizzle-orm/pg-core';

export const NOTE_STATUSES = ['active', 'archived', 'trashed'] as const;
export type NoteStatus = (typeof NOTE_STATUSES)[number];

// Owned by the notes module — tenant-schema table, created by
// migrations/0002_add_note.sql (metadata columns added by
// migrations/0004_add_note_metadata.sql). No other module may import this
// table directly; cross-feature access goes through NotesService.
// See: skills/tenant-data-access/SKILL.md
export const note = pgTable(
  'note',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    pinned: boolean('pinned').notNull().default(false),
    status: varchar('status', { length: 16 })
      .notNull()
      .default('active')
      .$type<NoteStatus>(),
    color: varchar('color', { length: 32 }),
    labels: jsonb('labels').notNull().default([]).$type<string[]>(),
    reminderAt: timestamp('reminder_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('note_created_at_idx').on(table.createdAt.desc()),
    index('note_status_idx').on(table.status),
  ],
);
