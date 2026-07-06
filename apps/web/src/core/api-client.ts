import {
  SESSION_STORAGE_KEYS,
  type LoginResponse,
  type MemberRow,
  type SessionUser,
  type TenantRole,
  type CustomMenuItem,
} from '@boilerplate/contracts';
import { buildQueryString, createHttpClient, normalizeApiUrl } from '@boilerplate/ui-common';

export type { LoginResponse, MemberRow, SessionUser, TenantRole, CustomMenuItem };
export { ApiError } from '@boilerplate/ui-common';

const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL, '/api/v1');

export function getAccessToken(): string | null {
  return localStorage.getItem(SESSION_STORAGE_KEYS.accessToken);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(SESSION_STORAGE_KEYS.refreshToken);
}

export function getTenantSlug(): string | null {
  return localStorage.getItem(SESSION_STORAGE_KEYS.tenantSlug);
}

export function setSession(input: { accessToken: string; refreshToken: string; tenantSlug?: string | null }): void {
  localStorage.setItem(SESSION_STORAGE_KEYS.accessToken, input.accessToken);
  localStorage.setItem(SESSION_STORAGE_KEYS.refreshToken, input.refreshToken);
  if (input.tenantSlug) localStorage.setItem(SESSION_STORAGE_KEYS.tenantSlug, input.tenantSlug);
  else localStorage.removeItem(SESSION_STORAGE_KEYS.tenantSlug);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEYS.accessToken);
  localStorage.removeItem(SESSION_STORAGE_KEYS.refreshToken);
  localStorage.removeItem(SESSION_STORAGE_KEYS.tenantSlug);
}

export function savePlatformSessionBackup(): void {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!accessToken || !refreshToken) return;
  sessionStorage.setItem(
    SESSION_STORAGE_KEYS.platformSessionBackup,
    JSON.stringify({ accessToken, refreshToken }),
  );
}

export function restorePlatformSessionBackup(): boolean {
  const raw = sessionStorage.getItem(SESSION_STORAGE_KEYS.platformSessionBackup);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!data.accessToken || !data.refreshToken) return false;
    setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.platformSessionBackup);
    return true;
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.platformSessionBackup);
    return false;
  }
}

// Transport (fetch + 401 refresh-and-retry) is shared with apps/mobile via
// @boilerplate/ui-common's createHttpClient — only the TokenStore backing
// (localStorage here, AsyncStorage on mobile) differs per platform.
const { apiFetch, apiDownload, apiFetchStream } = createHttpClient({
  baseUrl: API_URL,
  tokenStore: { getAccessToken, getRefreshToken, getTenantSlug, setSession, clearSession },
});
export { apiFetch, apiDownload, apiFetchStream };

// --- typed endpoint helpers — mirrors apps/api/src/core/auth/auth.controller.ts & tenants.controller.ts ---

export function apiLogin(tenantSlug: string, email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    tenantSlug,
    skipAuth: true,
    body: { email, password },
  });
}

export function apiLoginSuperAdmin(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/super-admin/login', {
    method: 'POST',
    skipAuth: true,
    body: { email, password },
  });
}

export function apiVerifyTwoFactorLogin(
  partialToken: string,
  code: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  return apiFetch('/auth/2fa/verify-login', { method: 'POST', skipAuth: true, body: { partialToken, code } });
}

export function apiLogout(refreshToken: string): Promise<{ ok: true }> {
  return apiFetch('/auth/logout', { method: 'POST', body: { refreshToken } });
}

export type MeResponse = SessionUser;

export function apiGetMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/auth/me');
}

export function apiAcceptInvite(
  tenantSlug: string,
  token: string,
  password: string,
  fullName?: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  return apiFetch('/auth/invites/accept', {
    method: 'POST',
    tenantSlug,
    skipAuth: true,
    body: { token, password, fullName },
  });
}

export function apiSetupTwoFactor(): Promise<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }> {
  return apiFetch('/auth/2fa/setup', { method: 'POST' });
}

export function apiEnableTwoFactor(code: string): Promise<{ backupCodes: string[] }> {
  return apiFetch('/auth/2fa/enable', { method: 'POST', body: { code } });
}

export function apiDisableTwoFactor(password: string): Promise<{ ok: true }> {
  return apiFetch('/auth/2fa/disable', { method: 'POST', body: { password } });
}

export type TenantRoleRow = {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MemberListParams = {
  search?: string;
  status?: 'invited' | 'active';
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

export type MemberListResult = {
  rows: MemberRow[];
  total: number;
  limit: number;
  offset: number;
};

export function apiListMembers(params: MemberListParams = {}): Promise<MemberListResult> {
  return apiFetch(`/tenants/members${buildQueryString(params)}`);
}

export function apiCreateInvite(email: string, role: TenantRole): Promise<{ inviteToken: string }> {
  return apiFetch('/auth/invites', { method: 'POST', body: { email, role } });
}

export function apiCreateTenantUser(input: {
  email: string;
  fullName?: string;
  role: TenantRole;
  password?: string;
}): Promise<MemberRow & { temporaryPassword?: string }> {
  return apiFetch('/auth/users', { method: 'POST', body: input });
}

export function apiUpdateMemberRole(userId: string, role: TenantRole): Promise<{ ok: true }> {
  return apiFetch(`/tenants/members/${userId}`, { method: 'PATCH', body: { role } });
}

export function apiUpdateMemberRoleKey(userId: string, roleKey: string): Promise<{ ok: true }> {
  return apiFetch(`/tenants/members/${userId}/role`, { method: 'PATCH', body: { roleKey } });
}

export function apiRemoveMember(userId: string): Promise<{ ok: true }> {
  return apiFetch(`/tenants/members/${userId}`, { method: 'DELETE' });
}

export function apiListTenantRoles(): Promise<TenantRoleRow[]> {
  return apiFetch('/tenants/roles');
}

export function apiCreateTenantRole(input: {
  key: string;
  name: string;
  description?: string;
  permissions: string[];
}): Promise<TenantRoleRow> {
  return apiFetch('/tenants/roles', { method: 'POST', body: input });
}

export function apiUpdateTenantRole(
  key: string,
  input: {
    name?: string;
    description?: string;
    permissions?: string[];
  },
): Promise<TenantRoleRow> {
  return apiFetch(`/tenants/roles/${key}`, { method: 'PATCH', body: input });
}

export function apiDeleteTenantRole(key: string): Promise<{ ok: true }> {
  return apiFetch(`/tenants/roles/${key}`, { method: 'DELETE' });
}

export type TenantSettings = {
  tenantId: string;
  tenantSlug: string;
  companyName: string | null;
  brandColor: string;
  logoUrl: string | null;
  settings: TenantSettingsPayload;
};

export type DashboardWidgetKey = 'tenant' | 'role' | 'modules' | 'quickLinks' | 'activity';

export type TenantSettingsPayload = {
  general: {
    timezone: string;
    locale: string;
    dateFormat: string;
    currency: string;
    weekStartsOn: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    defaultRange: string;
    widgets: DashboardWidgetKey[];
    quickLinkLimit: number;
  };
  navigation: {
    defaultCollapsed: boolean;
    moduleGrouping: 'category' | 'flat';
    showSearch: boolean;
  };
  notifications: {
    fromEmail: string;
    digestFrequency: string;
    enableInApp: boolean;
    enableEmail: boolean;
  };
  security: {
    requireTwoFactor: boolean;
    sessionTimeoutMinutes: number;
    allowedDomains: string[];
  };
  integrations: {
    webhookUrl: string;
    supportEmail: string;
    aiModel: string;
  };
  data: {
    retentionDays: number;
    exportFormat: string;
  };
};

export function apiGetTenantSettings(): Promise<TenantSettings> {
  return apiFetch('/tenants/settings');
}

export type TenantBranding = {
  companyName: string | null;
  brandColor: string;
  logoUrl: string | null;
};

// Pre-auth — brands the login screen. Resolves 404 to null (unknown slug)
// instead of surfacing an error while the user is still typing.
export async function apiGetTenantBranding(tenantSlug: string): Promise<TenantBranding | null> {
  return apiFetch<TenantBranding | null>(`/tenants/branding${buildQueryString({ slug: tenantSlug })}`, {
    skipAuth: true,
  });
}

export function apiUpdateTenantSettings(input: {
  companyName?: string;
  brandColor?: string;
  logoUrl?: string;
  settings?: Partial<TenantSettingsPayload>;
}): Promise<TenantSettings> {
  return apiFetch('/tenants/settings', { method: 'PATCH', body: input });
}

// --- platform-wide tenant management — mirrors admin-tenants.controller.ts, super-admin only ---

export type AdminTenantRow = {
  id: string;
  slug: string;
  schemaName: string;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
  memberCount: number;
};

export type AvailableModule = { key: string; label: string };
export type TenantFeatureRow = AvailableModule & { enabled: boolean };

export type TenantListParams = {
  search?: string;
  status?: 'active' | 'suspended';
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

export type TenantListResult = {
  rows: AdminTenantRow[];
  total: number;
  limit: number;
  offset: number;
};

export function apiListTenants(params: TenantListParams = {}): Promise<TenantListResult> {
  return apiFetch(`/admin/tenants${buildQueryString(params)}`);
}

export function apiListAvailableModules(): Promise<AvailableModule[]> {
  return apiFetch('/admin/tenants/available-modules');
}

export function apiCreateTenant(slug: string, features: string[]): Promise<AdminTenantRow> {
  return apiFetch('/admin/tenants', { method: 'POST', body: { slug, features } });
}

export function apiUpdateTenantStatus(tenantId: string, status: 'active' | 'suspended'): Promise<{ ok: true }> {
  return apiFetch(`/admin/tenants/${tenantId}/status`, { method: 'PATCH', body: { status } });
}

export function apiDeleteTenant(tenantId: string): Promise<{ ok: true }> {
  return apiFetch(`/admin/tenants/${tenantId}`, { method: 'DELETE' });
}

export function apiListTenantMembers(tenantId: string): Promise<MemberRow[]> {
  return apiFetch(`/admin/tenants/${tenantId}/members`);
}

export function apiListTenantFeatures(tenantId: string): Promise<TenantFeatureRow[]> {
  return apiFetch(`/admin/tenants/${tenantId}/features`);
}

export function apiGetTenantMenuOrder(): Promise<{ itemOrder: CustomMenuItem[] }> {
  return apiFetch('/tenants/menu-order');
}

export function apiUpdateTenantMenuOrder(itemOrder: CustomMenuItem[]): Promise<{ itemOrder: CustomMenuItem[] }> {
  return apiFetch('/tenants/menu-order', { method: 'PATCH', body: { itemOrder } });
}

export function apiGetGlobalMenuOrder(): Promise<{ itemOrder: CustomMenuItem[] }> {
  return apiFetch('/admin/tenants/menu-order');
}

export function apiUpdateGlobalMenuOrder(itemOrder: CustomMenuItem[]): Promise<{ itemOrder: CustomMenuItem[] }> {
  return apiFetch('/admin/tenants/menu-order', { method: 'PATCH', body: { itemOrder } });
}

export function apiGetAdminTenantMenuOrder(tenantId: string): Promise<{ itemOrder: CustomMenuItem[] }> {
  return apiFetch(`/admin/tenants/${tenantId}/menu-order`);
}

export function apiUpdateAdminTenantMenuOrder(
  tenantId: string,
  itemOrder: CustomMenuItem[],
): Promise<{ itemOrder: CustomMenuItem[] }> {
  return apiFetch(`/admin/tenants/${tenantId}/menu-order`, { method: 'PATCH', body: { itemOrder } });
}

export function apiUpdateTenantFeature(
  tenantId: string,
  featureKey: string,
  enabled: boolean,
): Promise<{ ok: true }> {
  return apiFetch(`/admin/tenants/${tenantId}/features`, {
    method: 'PATCH',
    body: { featureKey, enabled },
  });
}

export function apiImpersonateTenantUser(
  tenantId: string,
  userId: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  return apiFetch(`/auth/super-admin/tenants/${tenantId}/users/${userId}/impersonate`, {
    method: 'POST',
  });
}

export function apiSuperAdminCreateInvite(
  tenantId: string,
  email: string,
  role: TenantRole,
): Promise<{ inviteToken: string }> {
  return apiFetch(`/auth/super-admin/tenants/${tenantId}/invites`, {
    method: 'POST',
    body: { email, role },
  });
}

export function apiSuperAdminCreateTenantUser(
  tenantId: string,
  input: {
    email: string;
    fullName?: string;
    role: TenantRole;
    password?: string;
  },
): Promise<MemberRow & { temporaryPassword?: string }> {
  return apiFetch(`/auth/super-admin/tenants/${tenantId}/users`, {
    method: 'POST',
    body: input,
  });
}

export type AuditLogRow = {
  id: string;
  tenantId: string | null;
  tenantSlug: string | null;
  userId: string | null;
  userEmail: string | null;
  action: string;
  metadata: unknown;
  createdAt: string;
};

export function apiListAuditLogs(params?: { action?: string; userId?: string; limit?: number; offset?: number }): Promise<AuditLogRow[]> {
  return apiFetch(`/audit-logs${buildQueryString(params)}`);
}

export function apiListTenantAuditLogs(tenantId: string, params?: { action?: string; userId?: string; limit?: number; offset?: number }): Promise<AuditLogRow[]> {
  return apiFetch(`/admin/tenants/${tenantId}/audit-logs${buildQueryString(params)}`);
}

export function apiListGlobalAuditLogs(params?: { tenantId?: string; action?: string; userId?: string; limit?: number; offset?: number }): Promise<AuditLogRow[]> {
  return apiFetch(`/admin/audit-logs${buildQueryString(params)}`);
}
