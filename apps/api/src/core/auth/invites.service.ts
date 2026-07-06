import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { AuditLogService } from '../common/audit-log.service';
import { authConfig, type AuthConfig } from '../config';
import { CORE_DB, type CoreDb } from '../database/database.providers';
import { invites } from '../database/schema/core-schema';
import { MembershipsService } from '../tenants/memberships.service';
import { TenantsService } from '../tenants/tenants.service';
import type { TenantRole } from '../tenants/tenant-context';
import { UsersService } from '../users/users.service';
import type { AuthTokens } from './token.service';
import { TokenService } from './token.service';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function emailDomain(email: string): string {
  return email.trim().toLowerCase().split('@')[1] ?? '';
}

/**
 * Invite/onboarding flows: creating an invite, creating a user directly
 * (super-admin/admin shortcut), and accepting an invite. Split out of
 * AuthService since these are membership-provisioning concerns, not
 * session/login concerns.
 */
@Injectable()
export class InvitesService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
    private readonly membershipsService: MembershipsService,
    private readonly tokenService: TokenService,
    private readonly auditLogService: AuditLogService,
    @Inject(authConfig.KEY) private readonly auth: AuthConfig,
  ) {}

  private async assertEmailDomainAllowed(
    tenantId: string,
    email: string,
  ): Promise<void> {
    const settings = await this.tenantsService.getSettings(tenantId);
    const allowedDomains = (settings?.settings.security.allowedDomains ?? [])
      .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean);
    if (allowedDomains.length === 0) return;
    if (!allowedDomains.includes(emailDomain(email))) {
      throw new BadRequestException('Email domain is not allowed');
    }
  }

  async createInvite(
    tenantId: string,
    invitedBy: string,
    email: string,
    role: TenantRole,
  ): Promise<{ inviteToken: string }> {
    await this.assertEmailDomainAllowed(tenantId, email);
    const user = await this.usersService.findOrCreateByEmail(email);
    await this.membershipsService.createMembership({
      tenantId,
      userId: user.id,
      role,
      status: 'invited',
    });

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + this.auth.inviteTtlDays * 24 * 60 * 60 * 1000,
    );
    await this.db.insert(invites).values({
      tenantId,
      email: email.toLowerCase(),
      role,
      tokenHash: hashToken(rawToken),
      invitedBy,
      expiresAt,
    });

    await this.auditLogService.log({
      tenantId,
      userId: invitedBy,
      action: 'auth.invite_created',
      metadata: { email },
    });

    // No mail infra in this boilerplate — the caller is responsible for
    // delivering this token (e.g. as a link to the accept-invite page) out
    // of band; in production, email it instead of returning it directly.
    return { inviteToken: rawToken };
  }

  async createTenantUser(
    tenantId: string,
    createdBy: string,
    input: {
      email: string;
      fullName?: string;
      role: TenantRole;
      password?: string;
    },
  ): Promise<{
    userId: string;
    email: string;
    fullName: string | null;
    role: TenantRole;
    status: 'active';
    temporaryPassword?: string;
  }> {
    await this.assertEmailDomainAllowed(tenantId, input.email);
    const temporaryPassword =
      input.password ?? randomBytes(12).toString('base64url');
    const { user } = await this.usersService.findOrCreateWithPassword({
      email: input.email,
      fullName: input.fullName,
      password: temporaryPassword,
    });

    await this.membershipsService.createMembership({
      tenantId,
      userId: user.id,
      role: input.role,
      status: 'active',
    });

    await this.auditLogService.log({
      tenantId,
      userId: createdBy,
      action: 'auth.user_created',
      metadata: { email: input.email.toLowerCase(), role: input.role },
    });

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: input.role,
      status: 'active',
      temporaryPassword: input.password ? undefined : temporaryPassword,
    };
  }

  async acceptInvite(
    tenantId: string,
    rawToken: string,
    password: string,
    fullName?: string,
  ): Promise<AuthTokens> {
    const tokenHash = hashToken(rawToken);
    const [invite] = await this.db
      .select()
      .from(invites)
      .where(
        and(eq(invites.tenantId, tenantId), eq(invites.tokenHash, tokenHash)),
      )
      .limit(1);

    if (
      !invite ||
      invite.status !== 'pending' ||
      invite.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired invite');
    }

    const user = await this.usersService.findByEmail(invite.email);
    if (!user) throw new BadRequestException('Invalid invite');

    await this.usersService.setPassword(user.id, password);
    if (fullName) await this.usersService.updateProfile(user.id, { fullName });
    await this.membershipsService.activateMembership(tenantId, user.id);
    await this.db
      .update(invites)
      .set({ status: 'accepted', acceptedAt: new Date() })
      .where(eq(invites.id, invite.id));

    await this.auditLogService.log({
      tenantId,
      userId: user.id,
      action: 'auth.invite_accepted',
    });

    const membership = await this.membershipsService.getMembership(
      tenantId,
      user.id,
    );
    const tenant = await this.tenantsService.findById(tenantId);
    if (!membership || !tenant) throw new BadRequestException('Invalid invite');

    return this.tokenService.issueFullSession(
      user,
      tenant.id,
      tenant.slug,
      membership.role,
    );
  }
}
