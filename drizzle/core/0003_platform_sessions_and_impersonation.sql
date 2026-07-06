-- Platform sessions are not tenant-bound. Impersonation sessions preserve
-- the super admin actor and the forced read-only tenant role across refresh.

ALTER TABLE refresh_tokens ALTER COLUMN tenant_id DROP NOT NULL;

ALTER TABLE refresh_tokens
  ADD COLUMN impersonated_by uuid REFERENCES users(id),
  ADD COLUMN impersonation_role tenant_role;
