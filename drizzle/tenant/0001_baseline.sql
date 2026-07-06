-- Baseline migrations applied to EVERY tenant schema (tenant_<slug>).
-- Keep in sync with apps/api/src/core/database/schema/tenant-schema.ts.
-- See: docs/multi-tenant-modular-boilerplate-architecture.md §8

CREATE TABLE IF NOT EXISTS tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(128) NOT NULL UNIQUE,
  value jsonb,
  updated_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(64) NOT NULL UNIQUE,
  color varchar(32) NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name varchar(255) NOT NULL,
  file_type varchar(128) NOT NULL,
  file_size integer NOT NULL,
  storage_key varchar(512) NOT NULL,
  uploaded_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
