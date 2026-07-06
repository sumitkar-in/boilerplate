import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  TenantReactContext,
  type AuthStatus,
  type CurrentUser,
  type LoginOutcome,
  type TenantContextValue,
  type TenantRole,
} from '@boilerplate/ui-common';
import * as api from './api-client';

export function TenantProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [role, setRole] = useState<TenantRole | null>(null);
  const [sessionType, setSessionType] = useState<'tenant' | 'platform' | 'impersonation' | null>(null);
  const [impersonatedBy, setImpersonatedBy] = useState<string | null>(null);
  const [impersonatedByEmail, setImpersonatedByEmail] = useState<string | null>(null);
  const [enabledFeatureKeys, setEnabledFeatureKeys] = useState<Set<string>>(new Set());

  const hydrate = useCallback(async () => {
    try {
      const me = await api.apiGetMe();
      setUser({
        userId: me.userId,
        email: me.email,
        fullName: me.fullName,
        twoFactorEnabled: me.twoFactorEnabled,
        isSuperAdmin: me.isSuperAdmin,
      });
      setTenantId(me.tenantId || null);
      setTenantSlug(me.tenantSlug || null);
      setRole(me.role);
      setSessionType(me.sessionType);
      setImpersonatedBy(me.impersonatedBy ?? null);
      setImpersonatedByEmail(me.impersonatedByEmail ?? null);
      setEnabledFeatureKeys(new Set(me.enabledFeatureKeys));
      setStatus('authenticated');
    } catch {
      api.clearSession();
      setUser(null);
      setTenantId(null);
      setTenantSlug(null);
      setRole(null);
      setSessionType(null);
      setImpersonatedBy(null);
      setImpersonatedByEmail(null);
      setEnabledFeatureKeys(new Set());
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.hydrateTokenCache().then(() => {
      if (cancelled) return;
      if (!api.getAccessToken()) {
        setStatus('unauthenticated');
        return;
      }
      api.apiGetMe().then(
        (me) => {
          if (cancelled) return;
          setUser({
            userId: me.userId,
            email: me.email,
            fullName: me.fullName,
            twoFactorEnabled: me.twoFactorEnabled,
            isSuperAdmin: me.isSuperAdmin,
          });
          setTenantId(me.tenantId || null);
          setTenantSlug(me.tenantSlug || null);
          setRole(me.role);
          setSessionType(me.sessionType);
          setImpersonatedBy(me.impersonatedBy ?? null);
          setImpersonatedByEmail(me.impersonatedByEmail ?? null);
          setEnabledFeatureKeys(new Set(me.enabledFeatureKeys));
          setStatus('authenticated');
        },
        () => {
          if (cancelled) return;
          api.clearSession();
          setStatus('unauthenticated');
        },
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (slug: string, email: string, password: string): Promise<LoginOutcome> => {
      const result = await api.apiLogin(slug, email, password);
      if (result.twoFactorRequired) {
        return { twoFactorRequired: true, partialToken: result.partialToken };
      }
      api.setSession({ accessToken: result.accessToken, refreshToken: result.refreshToken, tenantSlug: slug });
      await hydrate();
      return { twoFactorRequired: false };
    },
    [hydrate],
  );

  const loginSuperAdmin = useCallback(
    async (email: string, password: string): Promise<LoginOutcome> => {
      const result = await api.apiLoginSuperAdmin(email, password);
      if (result.twoFactorRequired) {
        return { twoFactorRequired: true, partialToken: result.partialToken };
      }
      api.setSession({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      await hydrate();
      return { twoFactorRequired: false };
    },
    [hydrate],
  );

  const verifyTwoFactor = useCallback(
    async (partialToken: string, code: string) => {
      const result = await api.apiVerifyTwoFactorLogin(partialToken, code);
      const slug = api.getTenantSlug() ?? '';
      api.setSession({ accessToken: result.accessToken, refreshToken: result.refreshToken, tenantSlug: slug || null });
      await hydrate();
    },
    [hydrate],
  );

  const logout = useCallback(async () => {
    const refreshToken = api.getRefreshToken();
    if (refreshToken) {
      try {
        await api.apiLogout(refreshToken);
      } catch {
        // best effort
      }
    }
    api.clearSession();
    setUser(null);
    setTenantId(null);
    setTenantSlug(null);
    setRole(null);
    setSessionType(null);
    setImpersonatedBy(null);
    setImpersonatedByEmail(null);
    setEnabledFeatureKeys(new Set());
    setStatus('unauthenticated');
  }, []);

  const refreshMe = useCallback(() => hydrate(), [hydrate]);

  const value = useMemo<TenantContextValue>(
    () => ({
      status,
      user,
      tenantId,
      tenantSlug,
      role,
      sessionType,
      impersonatedBy,
      impersonatedByEmail,
      enabledFeatureKeys,
      login,
      loginSuperAdmin,
      verifyTwoFactor,
      logout,
      refreshMe,
    }),
    [
      status,
      user,
      tenantId,
      tenantSlug,
      role,
      sessionType,
      impersonatedBy,
      impersonatedByEmail,
      enabledFeatureKeys,
      login,
      loginSuperAdmin,
      verifyTwoFactor,
      logout,
      refreshMe,
    ],
  );

  return <TenantReactContext.Provider value={value}>{children}</TenantReactContext.Provider>;
}
