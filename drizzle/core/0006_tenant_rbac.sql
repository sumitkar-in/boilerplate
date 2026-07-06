ALTER TABLE tenant_memberships
  ADD COLUMN IF NOT EXISTS role_key text NOT NULL DEFAULT 'member';

UPDATE tenant_memberships
SET role_key = role::text
WHERE role_key IS NULL OR role_key = '';

CREATE TABLE IF NOT EXISTS tenant_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key)
);

INSERT INTO tenant_roles (tenant_id, key, name, description, permissions, is_system)
SELECT t.id, r.key, r.name, r.description, r.permissions::jsonb, true
FROM tenants t
CROSS JOIN (
  VALUES
    ('owner', 'Owner', 'Full tenant administration access', '["*"]'),
    ('admin', 'Admin', 'Manage tenant settings, users, and module data', '["tenant:settings:read","tenant:settings:update","tenant:members:read","tenant:members:create","tenant:members:update","tenant:members:delete","tenant:roles:read","modules:*"]'),
    ('member', 'Member', 'Create and manage module data', '["tenant:settings:read","modules:read","modules:create","modules:update","modules:delete"]'),
    ('viewer', 'Viewer', 'Read-only access to tenant module data', '["tenant:settings:read","modules:read"]')
) AS r(key, name, description, permissions)
ON CONFLICT (tenant_id, key) DO NOTHING;
