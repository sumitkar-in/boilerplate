import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SESSION_STORAGE_KEYS,
  type ListResponse,
  type LoginResponse,
  type MemberRow,
  type SessionUser,
  type TenantRole,
} from '@boilerplate/contracts';
import { ApiError, buildQueryString, createHttpClient, normalizeApiUrl } from '@boilerplate/ui-common';

export type { LoginResponse, MemberRow, SessionUser, TenantRole } from '@boilerplate/contracts';
export { ApiError } from '@boilerplate/ui-common';

declare const process:
  | { env?: { EXPO_PUBLIC_API_URL?: string } }
  | undefined;

const API_URL = normalizeApiUrl(process?.env?.EXPO_PUBLIC_API_URL, 'http://10.0.2.2:3000/api/v1');

// In-memory cache to support synchronous getAccessToken/getRefreshToken calls like web
let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;
let cachedTenantSlug: string | null = null;
let cachedBackup: string | null = null;

export async function hydrateTokenCache(): Promise<void> {
  cachedAccessToken = await AsyncStorage.getItem(SESSION_STORAGE_KEYS.accessToken);
  cachedRefreshToken = await AsyncStorage.getItem(SESSION_STORAGE_KEYS.refreshToken);
  cachedTenantSlug = await AsyncStorage.getItem(SESSION_STORAGE_KEYS.tenantSlug);
  cachedBackup = await AsyncStorage.getItem(SESSION_STORAGE_KEYS.platformSessionBackup);
}

export function getAccessToken(): string | null {
  return cachedAccessToken;
}

export function getRefreshToken(): string | null {
  return cachedRefreshToken;
}

export function getTenantSlug(): string | null {
  return cachedTenantSlug;
}

export function setSession(input: { accessToken: string; refreshToken: string; tenantSlug?: string | null }): void {
  cachedAccessToken = input.accessToken;
  cachedRefreshToken = input.refreshToken;
  cachedTenantSlug = input.tenantSlug ?? null;

  void AsyncStorage.setItem(SESSION_STORAGE_KEYS.accessToken, input.accessToken);
  void AsyncStorage.setItem(SESSION_STORAGE_KEYS.refreshToken, input.refreshToken);
  if (input.tenantSlug) {
    void AsyncStorage.setItem(SESSION_STORAGE_KEYS.tenantSlug, input.tenantSlug);
  } else {
    void AsyncStorage.removeItem(SESSION_STORAGE_KEYS.tenantSlug);
  }
}

export function clearSession(): void {
  cachedAccessToken = null;
  cachedRefreshToken = null;
  cachedTenantSlug = null;

  void AsyncStorage.removeItem(SESSION_STORAGE_KEYS.accessToken);
  void AsyncStorage.removeItem(SESSION_STORAGE_KEYS.refreshToken);
  void AsyncStorage.removeItem(SESSION_STORAGE_KEYS.tenantSlug);
}

export function savePlatformSessionBackup(): void {
  if (!cachedAccessToken || !cachedRefreshToken) return;
  const backupVal = JSON.stringify({ accessToken: cachedAccessToken, refreshToken: cachedRefreshToken });
  cachedBackup = backupVal;
  void AsyncStorage.setItem(SESSION_STORAGE_KEYS.platformSessionBackup, backupVal);
}

export function restorePlatformSessionBackup(): boolean {
  if (!cachedBackup) return false;
  try {
    const data = JSON.parse(cachedBackup) as { accessToken?: string; refreshToken?: string };
    if (!data.accessToken || !data.refreshToken) return false;
    setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    cachedBackup = null;
    void AsyncStorage.removeItem(SESSION_STORAGE_KEYS.platformSessionBackup);
    return true;
  } catch {
    cachedBackup = null;
    void AsyncStorage.removeItem(SESSION_STORAGE_KEYS.platformSessionBackup);
    return false;
  }
}

// Transport (fetch + 401 refresh-and-retry) is shared with apps/web via
// @boilerplate/ui-common's createHttpClient — only the TokenStore backing
// (AsyncStorage here, localStorage on web) differs per platform.
export const { apiFetch, apiDownload, apiFetchStream } = createHttpClient({
  baseUrl: API_URL,
  tokenStore: { getAccessToken, getRefreshToken, getTenantSlug, setSession, clearSession },
});

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

export type TenantBranding = {
  companyName: string | null;
  brandColor: string;
  logoUrl: string | null;
};

// Pre-auth — brands the login screen. Resolves 404 to null (unknown slug)
// instead of surfacing an error while the user is still typing.
export async function apiGetTenantBranding(tenantSlug: string): Promise<TenantBranding | null> {
  try {
    return await apiFetch<TenantBranding>('/tenants/branding', { tenantSlug, skipAuth: true });
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
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

export function apiListMembers(): Promise<ListResponse<MemberRow>> {
  return apiFetch('/tenants/members');
}

export function apiCreateInvite(email: string, role: TenantRole): Promise<{ inviteToken: string }> {
  return apiFetch('/auth/invites', { method: 'POST', body: { email, role } });
}

export function apiUpdateMemberRole(userId: string, role: TenantRole): Promise<{ ok: true }> {
  return apiFetch(`/tenants/members/${userId}`, { method: 'PATCH', body: { role } });
}

export function apiRemoveMember(userId: string): Promise<{ ok: true }> {
  return apiFetch(`/tenants/members/${userId}`, { method: 'DELETE' });
}

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

export function apiListTenants(): Promise<ListResponse<AdminTenantRow>> {
  return apiFetch('/admin/tenants');
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
