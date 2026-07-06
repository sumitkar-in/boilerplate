import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_FEATURE_KEY } from '../common/decorators/require-feature.decorator';
import { getTenantContext } from '../tenants/tenant-context';

/**
 * Reads the @RequireFeature() metadata set on a controller/handler and
 * checks it against the current TenantContext.enabledFeatures — which is
 * populated once per request by tenant-resolver.middleware.ts, so this
 * guard does no DB/Redis lookups of its own. Returns 403 if the tenant
 * doesn't have the feature enabled, before the handler ever runs.
 * See: skills/feature-flags/SKILL.md
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const featureKey = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!featureKey) return true; // route isn't gated by @RequireFeature()

    const tenant = getTenantContext();
    if (!tenant.enabledFeatures.has(featureKey)) {
      throw new ForbiddenException(
        `Feature "${featureKey}" is not enabled for this tenant`,
      );
    }
    return true;
  }
}
