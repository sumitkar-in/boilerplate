import { applyDecorators, Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { FeatureFlagGuard } from '../../feature-flags/feature-flag.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequireFeature } from './require-feature.decorator';

/**
 * The standard decorator stack for a tenant feature-module controller:
 * feature-flag gating (@RequireFeature + FeatureFlagGuard), permission
 * checks (PermissionsGuard, driven by per-route @Permissions()), and the
 * Swagger auth/tenant annotations. `featureKey` doubles as the route
 * prefix and the feature.json key.
 *
 *   @TenantModuleController('notes')
 *   export class NotesController { ... }
 *
 * Pass `path` when the route prefix differs from the feature key.
 */
export function TenantModuleController(
  featureKey: string,
  path: string = featureKey,
): ClassDecorator {
  return applyDecorators(
    ApiTags(path),
    ApiBearerAuth(),
    ApiSecurity('tenant'),
    RequireFeature(featureKey),
    UseGuards(FeatureFlagGuard, PermissionsGuard),
    Controller(path),
  );
}
