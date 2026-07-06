import { SetMetadata } from '@nestjs/common';
import type { TenantRole } from '../../tenants/tenant-context';

export const ROLES_KEY = 'roles';

/**
 * Marks a controller/route as requiring at least one of the given roles.
 * Read by RolesGuard, which checks TenantContext.role against a rank
 * hierarchy (owner > admin > member > viewer) — so @Roles('admin') also
 * allows 'owner'. Same @UseGuards()/metadata pattern as @RequireFeature()
 * + FeatureFlagGuard. See: skills/tenant-data-access/SKILL.md
 *
 * @Roles('admin')
 * @UseGuards(RolesGuard)
 * @Delete('members/:userId')
 */
export const Roles = (...roles: TenantRole[]) => SetMetadata(ROLES_KEY, roles);
