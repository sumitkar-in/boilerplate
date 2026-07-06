import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Drizzle table definitions for the `public` (core) schema — see
// docs/multi-tenant-modular-boilerplate-architecture.md §6. These describe
// the same tables created by drizzle/core/0001_init.sql; keep them in sync
// by hand since migrations here are plain SQL, not drizzle-kit generated.
// Self-referencing / cross-table FK *constraints* live in the SQL migration
// only — the TS defs below are for typed query building.

export const tenantStatusEnum = pgEnum('tenant_status', [
  'active',
  'suspended',
]);

export const tenantRoleEnum = pgEnum('tenant_role', [
  'owner',
  'admin',
  'member',
  'viewer',
]);

export const membershipStatusEnum = pgEnum('membership_status', [
  'invited',
  'active',
]);

export const inviteStatusEnum = pgEnum('invite_status', [
  'pending',
  'accepted',
  'revoked',
]);

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull(),
  schemaName: text('schema_name').notNull(),
  status: tenantStatusEnum('status').notNull().default('active'),
  companyName: text('company_name'),
  brandColor: text('brand_color').notNull().default('#35abc0'),
  logoUrl: text('logo_url'),
  settings: jsonb('settings').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  fullName: text('full_name'),
  isActive: boolean('is_active').notNull().default(true),
  // Platform-wide — grants owner-level access to every tenant without a
  // tenant_memberships row. See core/auth/auth.service.ts and
  // core/auth/auth-context.middleware.ts.
  isSuperAdmin: boolean('is_super_admin').notNull().default(false),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  // base32 TOTP secret — only trusted once twoFactorEnabled is true; a
  // non-null value with twoFactorEnabled=false means "setup in progress".
  twoFactorSecret: text('two_factor_secret'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tenantMemberships = pgTable(
  'tenant_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: tenantRoleEnum('role').notNull().default('member'),
    roleKey: text('role_key').notNull().default('member'),
    status: membershipStatusEnum('status').notNull().default('invited'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('tenant_memberships_tenant_user_idx').on(
      table.tenantId,
      table.userId,
    ),
  ],
);

export const tenantRoles = pgTable(
  'tenant_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    key: text('key').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    permissions: jsonb('permissions').notNull().default([]),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('tenant_roles_tenant_key_idx').on(table.tenantId, table.key),
  ],
);

export const featureFlags = pgTable(
  'feature_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    featureKey: text('feature_key').notNull(),
    enabled: boolean('enabled').notNull().default(false),
    enabledAt: timestamp('enabled_at', { withTimezone: true }),
    updatedBy: uuid('updated_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('feature_flags_tenant_key_idx').on(
      table.tenantId,
      table.featureKey,
    ),
  ],
);

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  impersonatedBy: uuid('impersonated_by').references(() => users.id),
  impersonationRole: tenantRoleEnum('impersonation_role'),
  // sha256 hex of the raw opaque refresh token — the raw value is only
  // ever seen by the client, never persisted.
  tokenHash: text('token_hash').notNull(),
  // groups a rotation chain; reusing an already-revoked token in the same
  // family revokes the whole family (theft/reuse detection).
  familyId: uuid('family_id').notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  replacedById: uuid('replaced_by_id'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const twoFactorBackupCodes = pgTable('two_factor_backup_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  codeHash: text('code_hash').notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  email: text('email').notNull(),
  role: tenantRoleEnum('role').notNull().default('member'),
  tokenHash: text('token_hash').notNull(),
  invitedBy: uuid('invited_by')
    .notNull()
    .references(() => users.id),
  status: inviteStatusEnum('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
});

export const menuPreferences = pgTable(
  'menu_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id),
    itemOrder: jsonb('item_order').notNull().default([]),
    updatedBy: uuid('updated_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('menu_preferences_tenant_idx').on(table.tenantId)],
);

export const coreSchema = {
  tenants,
  users,
  tenantMemberships,
  tenantRoles,
  featureFlags,
  auditLogs,
  refreshTokens,
  twoFactorBackupCodes,
  invites,
  menuPreferences,
};
