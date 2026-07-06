CREATE INDEX IF NOT EXISTS tenants_status_idx
  ON tenants (status);

CREATE INDEX IF NOT EXISTS tenant_memberships_tenant_status_idx
  ON tenant_memberships (tenant_id, status);

CREATE INDEX IF NOT EXISTS tenant_memberships_user_id_idx
  ON tenant_memberships (user_id);

CREATE INDEX IF NOT EXISTS tenant_roles_tenant_id_idx
  ON tenant_roles (tenant_id);

CREATE INDEX IF NOT EXISTS feature_flags_tenant_enabled_idx
  ON feature_flags (tenant_id, enabled);

CREATE INDEX IF NOT EXISTS audit_logs_tenant_created_idx
  ON audit_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_user_created_idx
  ON audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_action_created_idx
  ON audit_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_expires_idx
  ON refresh_tokens (user_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS invites_tenant_status_idx
  ON invites (tenant_id, status);
