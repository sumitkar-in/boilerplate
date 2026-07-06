import type { TenantRole } from '../tenants/tenant-context';

export type AccessTokenPayload = {
  sub: string; // userId
  tenantId?: string;
  tenantSlug?: string;
  role: TenantRole;
  sessionType?: 'tenant' | 'platform' | 'impersonation';
  impersonatedBy?: string;
  purpose: 'access';
};

// Issued after password verification when the user has 2FA enabled — can't
// be used as an access token because `purpose` is checked explicitly in
// JwtStrategy.validate().
export type TwoFactorPendingPayload = {
  sub: string; // userId
  tenantId?: string;
  sessionType?: 'tenant' | 'platform';
  purpose: '2fa-pending';
};
