import type { SessionType, MembershipStatus } from './enums';
import type { TenantRole } from './rbac';

export type ListResponse<T> = {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
};

export type LoginResponse =
  | { twoFactorRequired: true; partialToken: string }
  | {
      twoFactorRequired: false;
      accessToken: string;
      refreshToken: string;
      // Set when the tenant requires 2FA and this user hasn't enabled it
      // yet. Login still succeeds — the frontend must force the setup flow
      // (/auth/2fa/setup) before letting the user past this point.
      twoFactorSetupRequired?: boolean;
    };

export type SessionUser = {
  userId: string;
  email: string;
  fullName: string | null;
  twoFactorEnabled: boolean;
  twoFactorSetupRequired: boolean;
  tenantId: string;
  tenantSlug: string;
  role: TenantRole;
  enabledFeatureKeys: string[];
  isSuperAdmin: boolean;
  sessionType: SessionType;
  impersonatedBy?: string;
  impersonatedByEmail?: string;
};

export type MemberRow = {
  userId: string;
  email: string;
  fullName: string | null;
  role: TenantRole;
  roleKey: string;
  status: MembershipStatus;
};

export type Note = {
  id: string;
  title: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Department = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Employee = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  departmentId: string | null;
  managerId: string | null;
  customFields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};
