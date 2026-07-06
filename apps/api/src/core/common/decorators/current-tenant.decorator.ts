import { createParamDecorator } from '@nestjs/common';
import { getTenantContext, TenantContext } from '../../tenants/tenant-context';

/**
 * Injects the current request's TenantContext into a controller method.
 * See: skills/tenant-data-access/SKILL.md
 *
 * @Get()
 * findAll(@CurrentTenant() tenant: TenantContext) {
 *   return this.contactsService.findAll(tenant, query);
 * }
 */
export const CurrentTenant = createParamDecorator((): TenantContext =>
  getTenantContext(),
);
