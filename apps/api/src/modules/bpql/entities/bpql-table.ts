import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const BPQL_FIELD_TYPES = [
  'text',
  'number',
  'boolean',
  'date',
  'select',
] as const;

export type BpqlFieldType = (typeof BPQL_FIELD_TYPES)[number];

export type BpqlFieldDefinition = {
  key: string;
  label: string;
  type: BpqlFieldType;
  required?: boolean;
  options?: string[];
};

export const bpqlTable = pgTable(
  'bpql_tables',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 160 }).notNull(),
    slug: varchar('slug', { length: 80 }).notNull().unique(),
    description: text('description').notNull().default(''),
    fields: jsonb('fields')
      .notNull()
      .default([])
      .$type<BpqlFieldDefinition[]>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('bpql_tables_name_idx').on(table.name),
    index('bpql_tables_slug_idx').on(table.slug),
  ],
);
