export const TENANT_ROLE_KEYS = ['owner', 'admin', 'member', 'viewer'] as const;

export type TenantRole = (typeof TENANT_ROLE_KEYS)[number];

export const ROLE_RANK: Record<TenantRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
  viewer: 0,
};

export const DEFAULT_ROLE_PERMISSIONS: Record<TenantRole, readonly string[]> = {
  owner: ['*'],
  admin: [
    'tenant:settings:read',
    'tenant:settings:update',
    'tenant:members:read',
    'tenant:members:create',
    'tenant:members:update',
    'tenant:members:delete',
    'tenant:roles:read',
    'tenant:roles:create',
    'tenant:roles:update',
    'tenant:roles:delete',
    'modules:*',
  ],
  member: [
    'tenant:settings:read',
    'modules:read',
    'modules:create',
    'modules:update',
    'modules:delete',
  ],
  viewer: ['tenant:settings:read', 'modules:read'],
};

export const DEFAULT_TENANT_ROLES = [
  {
    key: 'owner',
    name: 'Owner',
    description: 'Full tenant administration access',
    permissions: DEFAULT_ROLE_PERMISSIONS.owner,
    isSystem: true,
  },
  {
    key: 'admin',
    name: 'Admin',
    description: 'Manage tenant settings, users, and module data',
    permissions: DEFAULT_ROLE_PERMISSIONS.admin,
    isSystem: true,
  },
  {
    key: 'member',
    name: 'Member',
    description: 'Create and manage module data',
    permissions: DEFAULT_ROLE_PERMISSIONS.member,
    isSystem: true,
  },
  {
    key: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to tenant module data',
    permissions: DEFAULT_ROLE_PERMISSIONS.viewer,
    isSystem: true,
  },
] as const;

/**
 * Every permission string known to the default role matrix, for building
 * a custom-role editor's checkbox list (e.g. RolesSettingsPage). New
 * modules/permissions should be added to DEFAULT_ROLE_PERMISSIONS above —
 * this catalog derives from it rather than duplicating the list.
 */
export const PERMISSION_CATALOG: readonly string[] = Array.from(
  new Set(Object.values(DEFAULT_ROLE_PERMISSIONS).flat()),
).sort();

/**
 * Rank-based role check — "does this role have at least admin-level
 * access", not an exact match. Mirrors RolesGuard's ROLE_RANK comparison
 * on the backend (core/common/guards/roles.guard.ts) so the frontend
 * never hardcodes `role === 'owner' || role === 'admin'` checks that can
 * drift from the actual role hierarchy.
 */
export function meetsMinimumRole(
  role: TenantRole | null | undefined,
  minimum: TenantRole,
): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function hasPermission(
  permissions: ReadonlySet<string>,
  required: string,
): boolean {
  if (permissions.has('*') || permissions.has(required)) return true;
  const [resource] = required.split(':');
  return permissions.has(`${resource}:*`);
}

export function toLegacyTenantRole(roleKey: string): TenantRole {
  if (roleKey === 'owner' || roleKey === 'admin' || roleKey === 'viewer') {
    return roleKey;
  }
  return 'member';
}
