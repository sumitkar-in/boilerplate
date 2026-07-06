import { createContext, useContext } from 'react';
import type { SessionType, TenantRole } from '@boilerplate/contracts';

export type { TenantRole };

export type CurrentUser = {
  userId: string;
  email: string;
  fullName: string | null;
  twoFactorEnabled: boolean;
  // Platform-wide — true regardless of which tenant is currently active.
  // See apps/api/src/core/auth/auth-context.middleware.ts.
  isSuperAdmin: boolean;
};

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type LoginOutcome = { twoFactorRequired: true; partialToken: string } | { twoFactorRequired: false };

// The platform-agnostic contract — apps/web/src/core/TenantProvider.tsx
// implements this using browser fetch()/localStorage; a mobile provider
// would implement the same shape using AsyncStorage/SecureStore instead.
// See: docs/multi-tenant-modular-boilerplate-architecture.md §11.2/§11.4
export type TenantContextValue = {
  status: AuthStatus;
  user: CurrentUser | null;
  tenantId: string | null;
  tenantSlug: string | null;
  role: TenantRole | null;
  sessionType: SessionType | null;
  impersonatedBy: string | null;
  // Email of the super admin behind an impersonation session, when resolvable.
  impersonatedByEmail: string | null;
  enabledFeatureKeys: Set<string>;
  login: (tenantSlug: string, email: string, password: string) => Promise<LoginOutcome>;
  loginSuperAdmin: (email: string, password: string) => Promise<LoginOutcome>;
  verifyTwoFactor: (partialToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

export const TenantReactContext = createContext<TenantContextValue | undefined>(undefined);

/** Reads the current auth/tenant state. Throws outside a TenantProvider. */
export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantReactContext);
  if (!ctx) {
    throw new Error('useTenant() must be used within a TenantProvider');
  }
  return ctx;
}
