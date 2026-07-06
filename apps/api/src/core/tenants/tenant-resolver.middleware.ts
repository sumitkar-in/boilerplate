import {
  Inject,
  Injectable,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { tenantConfig, type TenantConfig } from '../config';
import { TenantsService } from './tenants.service';
import type { ResolvedTenantIdentity } from '../common/decorators/resolved-tenant.decorator';

/**
 * Resolves tenant *identity* pre-auth — subdomain, then the x-tenant-id
 * header — and attaches a partial `req.resolvedTenant` (id/slug/schemaName
 * only, no user/role yet). Used by @Public() routes like /auth/login via
 * @ResolvedTenant().
 *
 * This does NOT populate the full TenantContext/AsyncLocalStorage — that
 * happens post-auth in TenantContextInterceptor, which reads the tenantId
 * out of the verified JWT and does a fresh role/enabledFeatures lookup
 * (never trusts a stale resolvedTenant for authorization). A protected
 * request with no subdomain/header still works — the interceptor is the
 * source of truth for authenticated requests.
 */
@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantsService: TenantsService,
    @Inject(tenantConfig.KEY) private readonly tenantCfg: TenantConfig,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const slug = this.resolveSlug(req);
    if (!slug) {
      next();
      return;
    }

    const tenant = await this.tenantsService.findBySlug(slug);
    if (!tenant || tenant.status !== 'active') {
      throw new NotFoundException(`Tenant "${slug}" not found`);
    }

    const resolved: ResolvedTenantIdentity = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      schemaName: tenant.schemaName,
    };
    (
      req as Request & { resolvedTenant?: ResolvedTenantIdentity }
    ).resolvedTenant = resolved;
    next();
  }

  private resolveSlug(req: Request): string | undefined {
    if (
      this.tenantCfg.baseDomain &&
      req.hostname &&
      req.hostname !== this.tenantCfg.baseDomain
    ) {
      const suffix = `.${this.tenantCfg.baseDomain}`;
      if (req.hostname.endsWith(suffix)) {
        return req.hostname.slice(0, -suffix.length);
      }
    }
    // NOTE: despite the header name, this must be the tenant's slug, not
    // its id — only findBySlug() is called below. Kept as x-tenant-id for
    // wire compatibility with existing clients/tests.
    const header = req.header('x-tenant-id');
    return header || undefined;
  }
}
