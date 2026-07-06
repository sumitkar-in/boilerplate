import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type ResolvedTenantIdentity = {
  tenantId: string;
  tenantSlug: string;
  schemaName: string;
};

/**
 * Injects the pre-auth tenant identity resolved by
 * tenant-resolver.middleware.ts (subdomain / x-tenant-id header) — used by
 * @Public() routes (login, accept-invite) that run before a JWT — and
 * therefore a full TenantContext — exists. Protected routes should use
 * @CurrentTenant() instead. See: skills/tenant-data-access/SKILL.md
 */
export const ResolvedTenant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ResolvedTenantIdentity => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { resolvedTenant?: ResolvedTenantIdentity }>();
    const resolved = request.resolvedTenant;
    if (!resolved) {
      throw new Error(
        'No resolved tenant on request — send an x-tenant-id header, or check TenantResolverMiddleware is registered.',
      );
    }
    return resolved;
  },
);
