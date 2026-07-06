import { AsyncLocalStorage } from 'node:async_hooks';
import type { TenantRole } from '@boilerplate/contracts';

export type { TenantRole };

export type TenantContext = {
  tenantId: string;
  tenantSlug: string;
  schemaName: string; // e.g. "tenant_acme"
  userId: string;
  role: TenantRole;
  roleKey: string;
  permissions: Set<string>;
  enabledFeatures: Set<string>;
  sessionType: 'tenant' | 'platform' | 'impersonation';
  impersonatedBy?: string;
  // Platform-wide — true regardless of which tenant this request is
  // scoped to. See core/auth/auth.service.ts (resolveRole) and
  // core/common/guards/super-admin.guard.ts.
  isSuperAdmin: boolean;
};

// Holds the resolved TenantContext for the lifetime of one request. Set by
// tenant-resolver.middleware.ts (subdomain → x-tenant-id header → JWT
// claim) for real requests; tests and cron fan-out establish it manually
// via runWithTenantContext(). See: skills/tenant-data-access/SKILL.md
export const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

/** Reads the current TenantContext. Throws if called outside a request that went through tenant-resolver.middleware.ts. */
export function getTenantContext(): TenantContext {
  const ctx = tenantContextStorage.getStore();
  if (!ctx) {
    throw new Error(
      'No TenantContext available for this code path. Every tenant-table query and ' +
        '@CurrentTenant()-using route must run inside tenant-resolver.middleware.ts. ' +
        'See skills/tenant-data-access/SKILL.md.',
    );
  }
  return ctx;
}

/** Runs `fn` with `ctx` set as the current TenantContext for its entire call tree. */
export function runWithTenantContext<T>(ctx: TenantContext, fn: () => T): T {
  return tenantContextStorage.run(ctx, fn);
}

/**
 * Sets `ctx` as the TenantContext for the remainder of the current async
 * execution (and everything awaited from this point on), without needing
 * to wrap a callback. Used by JwtAuthGuard once a request authenticates —
 * a guard can't cleanly wrap "the rest of the request pipeline" the way
 * `runWithTenantContext()` wraps a callback, so it uses
 * `AsyncLocalStorage.enterWith()` instead. Prefer `runWithTenantContext()`
 * anywhere a callback is available (tests, cron fan-out).
 */
export function enterTenantContext(ctx: TenantContext): void {
  tenantContextStorage.enterWith(ctx);
}
