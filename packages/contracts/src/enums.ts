export const TENANT_STATUSES = ['active', 'suspended'] as const;
export const MEMBERSHIP_STATUSES = ['invited', 'active'] as const;
export const SESSION_TYPES = ['tenant', 'platform', 'impersonation'] as const;

export type TenantStatus = (typeof TENANT_STATUSES)[number];
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];
export type SessionType = (typeof SESSION_TYPES)[number];
