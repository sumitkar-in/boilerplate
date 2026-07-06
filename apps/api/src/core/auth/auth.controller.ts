import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ResolvedTenant } from '../common/decorators/resolved-tenant.decorator';
import type { ResolvedTenantIdentity } from '../common/decorators/resolved-tenant.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import type { TenantContext } from '../tenants/tenant-context';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { InviteDto } from './dto/invite.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { TwoFactorDisableDto } from './dto/two-factor-disable.dto';
import { TwoFactorEnableDto } from './dto/two-factor-enable.dto';
import { TwoFactorVerifyLoginDto } from './dto/two-factor-verify-login.dto';
import { ImpersonationService } from './impersonation.service';
import { InvitesService } from './invites.service';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { TwoFactorService } from './two-factor.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorAuthService: TwoFactorAuthService,
    private readonly invitesService: InvitesService,
    private readonly impersonationService: ImpersonationService,
    private readonly twoFactorService: TwoFactorService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @ApiOkResponse({
    description:
      'Returns access and refresh tokens, or a partial 2FA login token.',
  })
  login(
    @ResolvedTenant() tenant: ResolvedTenantIdentity,
    @Body() dto: LoginDto,
  ) {
    return this.authService.login(
      tenant.tenantId,
      tenant.tenantSlug,
      dto.email,
      dto.password,
    );
  }

  @Public()
  @Post('super-admin/login')
  @ApiOkResponse({
    description:
      'Returns a platform-scoped super-admin session, or a partial 2FA token.',
  })
  loginSuperAdmin(@Body() dto: LoginDto) {
    return this.authService.loginSuperAdmin(dto.email, dto.password);
  }

  @Public()
  @Post('2fa/verify-login')
  @ApiOkResponse({
    description: 'Completes a two-factor login and returns tokens.',
  })
  verifyTwoFactorLogin(@Body() dto: TwoFactorVerifyLoginDto) {
    return this.twoFactorAuthService.verifyTwoFactorLogin(
      dto.partialToken,
      dto.code,
    );
  }

  @Public()
  @Post('refresh')
  @ApiOkResponse({ description: 'Refreshes an access token.' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('super-admin/tenants/:tenantId/users/:userId/impersonate')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description:
      'Issues a tenant-scoped read-only impersonation session for a tenant user.',
  })
  impersonateTenantUser(
    @CurrentTenant() current: TenantContext,
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
  ) {
    return this.impersonationService.impersonateTenantUser({
      superAdminId: current.userId,
      tenantId,
      userId,
    });
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Revokes a refresh token.' })
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refreshToken);
    return { ok: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Returns the current authenticated user and tenant context.',
  })
  async me(@CurrentTenant() tenant: TenantContext) {
    const [user, impersonator] = await Promise.all([
      this.usersService.findById(tenant.userId),
      // impersonatedBy carries the super admin's user id — resolve it so
      // the UI can show who is behind the impersonated view.
      tenant.impersonatedBy
        ? this.usersService.findById(tenant.impersonatedBy)
        : Promise.resolve(null),
    ]);
    // Only meaningful for tenant sessions — platform (super-admin) sessions
    // have no tenantId and aren't subject to a tenant's 2FA policy.
    const twoFactorSetupRequired =
      tenant.sessionType === 'tenant' && user
        ? await this.authService.requiresTwoFactorSetup(tenant.tenantId, user)
        : false;
    return {
      userId: tenant.userId,
      email: user?.email,
      fullName: user?.fullName,
      twoFactorEnabled: user?.twoFactorEnabled ?? false,
      twoFactorSetupRequired,
      tenantId: tenant.tenantId,
      tenantSlug: tenant.tenantSlug,
      role: tenant.role,
      enabledFeatureKeys: Array.from(tenant.enabledFeatures),
      isSuperAdmin: tenant.isSuperAdmin,
      sessionType: tenant.sessionType,
      impersonatedBy: tenant.impersonatedBy,
      impersonatedByEmail: impersonator?.email,
    };
  }

  @Permissions('tenant:members:create')
  @UseGuards(PermissionsGuard)
  @Post('invites')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: 'Creates an invitation for the current tenant.',
  })
  invite(@CurrentTenant() tenant: TenantContext, @Body() dto: InviteDto) {
    return this.invitesService.createInvite(
      tenant.tenantId,
      tenant.userId,
      dto.email,
      dto.role,
    );
  }

  @Permissions('tenant:members:create')
  @UseGuards(PermissionsGuard)
  @Post('users')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description:
      'Creates an active user in the current tenant. Generates a temporary password when omitted.',
  })
  createUser(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateTenantUserDto,
  ) {
    return this.invitesService.createTenantUser(
      tenant.tenantId,
      tenant.userId,
      {
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        password: dto.password,
      },
    );
  }

  @Post('super-admin/tenants/:tenantId/invites')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description:
      'Creates an invitation for a specific tenant as a super admin.',
  })
  inviteToTenant(
    @CurrentTenant() current: TenantContext,
    @Param('tenantId') tenantId: string,
    @Body() dto: InviteDto,
  ) {
    return this.invitesService.createInvite(
      tenantId,
      current.userId,
      dto.email,
      dto.role,
    );
  }

  @Post('super-admin/tenants/:tenantId/users')
  @UseGuards(SuperAdminGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description:
      'Creates an active user in a tenant as a super admin. Generates a temporary password when omitted.',
  })
  createUserForTenant(
    @CurrentTenant() current: TenantContext,
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateTenantUserDto,
  ) {
    return this.invitesService.createTenantUser(tenantId, current.userId, {
      email: dto.email,
      fullName: dto.fullName,
      role: dto.role,
      password: dto.password,
    });
  }

  @Public()
  @Post('invites/accept')
  @ApiOkResponse({
    description: 'Accepts an invitation and creates the invited user.',
  })
  acceptInvite(
    @ResolvedTenant() tenant: ResolvedTenantIdentity,
    @Body() dto: AcceptInviteDto,
  ) {
    return this.invitesService.acceptInvite(
      tenant.tenantId,
      dto.token,
      dto.password,
      dto.fullName,
    );
  }

  @Post('2fa/setup')
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Creates a two-factor secret and provisioning QR code.',
  })
  async setupTwoFactor(@CurrentTenant() tenant: TenantContext) {
    const user = await this.usersService.findById(tenant.userId);
    if (!user) throw new UnauthorizedException();
    return this.twoFactorService.setup(user);
  }

  @Post('2fa/enable')
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Confirms and enables two-factor authentication.',
  })
  async enableTwoFactor(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: TwoFactorEnableDto,
  ) {
    const user = await this.usersService.findById(tenant.userId);
    if (!user) throw new UnauthorizedException();
    return this.twoFactorService.confirmEnable(user, dto.code);
  }

  @Post('2fa/disable')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Disables two-factor authentication.' })
  async disableTwoFactor(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: TwoFactorDisableDto,
  ) {
    const user = await this.usersService.findById(tenant.userId);
    if (!user) throw new UnauthorizedException();
    const validPassword = await this.usersService.verifyPassword(
      user,
      dto.password,
    );
    if (!validPassword) throw new UnauthorizedException('Invalid password');
    await this.twoFactorService.disable(user);
    return { ok: true };
  }
}
