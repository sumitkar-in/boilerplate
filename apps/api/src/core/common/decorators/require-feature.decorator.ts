import { SetMetadata } from '@nestjs/common';

export const REQUIRE_FEATURE_KEY = 'requireFeature';

/**
 * Marks a controller or route handler as gated behind a tenant feature
 * flag. Read by FeatureFlagGuard, which returns 403 if the current
 * tenant's TenantContext.enabledFeatures doesn't contain this key.
 * See: skills/feature-flags/SKILL.md
 *
 * @RequireFeature('billing')
 * @Controller('billing')
 * export class BillingController {}
 */
export const RequireFeature = (featureKey: string) =>
  SetMetadata(REQUIRE_FEATURE_KEY, featureKey);
