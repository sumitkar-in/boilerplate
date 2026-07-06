-- Platform-wide super admin flag on users — a super admin can log into
-- any tenant with owner-level access without an explicit tenant_memberships
-- row. See apps/api/src/core/auth/auth.service.ts and
-- apps/api/src/core/auth/auth-context.middleware.ts.
-- Keep this in sync with apps/api/src/core/database/schema/core-schema.ts.

ALTER TABLE users ADD COLUMN is_super_admin boolean NOT NULL DEFAULT false;
