-- Core (public schema) tables — tenants, users, tenant_memberships,
-- feature_flags, audit_logs, plus auth/2FA-support tables (refresh_tokens,
-- two_factor_backup_codes, invites).
-- Keep this in sync with apps/api/src/core/database/schema/core-schema.ts.
-- See: skills/migrations/SKILL.md

CREATE TYPE tenant_status AS ENUM ('active', 'suspended');
CREATE TYPE tenant_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE membership_status AS ENUM ('invited', 'active');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'revoked');

CREATE TABLE tenants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  schema_name  text NOT NULL UNIQUE,
  status       tenant_status NOT NULL DEFAULT 'active',
  company_name text,
  brand_color  text NOT NULL DEFAULT '#35abc0',
  logo_url     text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               text NOT NULL UNIQUE,
  password_hash       text,
  full_name           text,
  is_active           boolean NOT NULL DEFAULT true,
  two_factor_enabled  boolean NOT NULL DEFAULT false,
  two_factor_secret   text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tenant_memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  user_id     uuid NOT NULL REFERENCES users(id),
  role        tenant_role NOT NULL DEFAULT 'member',
  status      membership_status NOT NULL DEFAULT 'invited',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE feature_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  feature_key text NOT NULL,
  enabled     boolean NOT NULL DEFAULT false,
  enabled_at  timestamptz,
  updated_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, feature_key)
);

CREATE TABLE audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid REFERENCES tenants(id),
  user_id     uuid REFERENCES users(id),
  action      text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id),
  tenant_id        uuid NOT NULL REFERENCES tenants(id),
  token_hash       text NOT NULL UNIQUE,
  family_id        uuid NOT NULL,
  revoked_at       timestamptz,
  replaced_by_id   uuid REFERENCES refresh_tokens(id),
  expires_at       timestamptz NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_family_id_idx ON refresh_tokens (family_id);
CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);

CREATE TABLE two_factor_backup_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id),
  code_hash   text NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX two_factor_backup_codes_user_id_idx ON two_factor_backup_codes (user_id);

CREATE TABLE invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  email        text NOT NULL,
  role         tenant_role NOT NULL DEFAULT 'member',
  token_hash   text NOT NULL UNIQUE,
  invited_by   uuid NOT NULL REFERENCES users(id),
  status       invite_status NOT NULL DEFAULT 'pending',
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  accepted_at  timestamptz
);
CREATE INDEX invites_tenant_id_idx ON invites (tenant_id);
CREATE INDEX invites_email_idx ON invites (email);
