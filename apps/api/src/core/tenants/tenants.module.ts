import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuditLogService } from '../common/audit-log.service';
import { AuditLogsController } from '../common/audit-logs.controller';
import { AdminTenantsController } from './admin-tenants.controller';
import { MembershipsService } from './memberships.service';
import { MenuPreferencesService } from './menu-preferences.service';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { TenantResolverMiddleware } from './tenant-resolver.middleware';
import { TenantRolesService } from './tenant-roles.service';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  controllers: [TenantsController, AdminTenantsController, AuditLogsController],
  providers: [
    TenantsService,
    MembershipsService,
    TenantRolesService,
    MenuPreferencesService,
    TenantProvisioningService,
    AuditLogService,
  ],
  exports: [
    TenantsService,
    MembershipsService,
    TenantRolesService,
    MenuPreferencesService,
    TenantProvisioningService,
    AuditLogService,
  ],
})
export class TenantsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // '{*splat}' is the Express 5 / path-to-regexp v8 wildcard-all syntax.
    consumer.apply(TenantResolverMiddleware).forRoutes('{*splat}');
  }
}
