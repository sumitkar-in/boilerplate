import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { authConfig, type AuthConfig } from '../config';
import { CORE_DB, type CoreDb } from '../database/database.providers';
import { users } from '../database/schema/core-schema';

export type UserRecord = typeof users.$inferSelect;

// Core-schema data access — core.users is the documented exception to the
// TenantContext-first rule (skills/tenant-data-access/SKILL.md), since user
// identity is shared across every tenant a user belongs to.
@Injectable()
export class UsersService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    @Inject(authConfig.KEY) private readonly auth: AuthConfig,
  ) {}

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return user;
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }

  async create(input: {
    email: string;
    fullName?: string;
    passwordHash?: string;
    isSuperAdmin?: boolean;
  }): Promise<UserRecord> {
    const [user] = await this.db
      .insert(users)
      .values({
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        passwordHash: input.passwordHash,
        isSuperAdmin: input.isSuperAdmin ?? false,
      })
      .returning();
    return user;
  }

  async createWithPassword(input: {
    email: string;
    fullName?: string;
    password: string;
    isSuperAdmin?: boolean;
  }): Promise<UserRecord> {
    const passwordHash = await bcrypt.hash(
      input.password,
      this.auth.passwordSaltRounds,
    );
    return this.create({
      email: input.email,
      fullName: input.fullName,
      passwordHash,
      isSuperAdmin: input.isSuperAdmin,
    });
  }

  async findOrCreateWithPassword(input: {
    email: string;
    fullName?: string;
    password: string;
  }): Promise<{ user: UserRecord; created: boolean }> {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      if (input.fullName && !existing.fullName) {
        await this.updateProfile(existing.id, { fullName: input.fullName });
        return {
          user: { ...existing, fullName: input.fullName },
          created: false,
        };
      }
      return { user: existing, created: false };
    }
    return {
      user: await this.createWithPassword(input),
      created: true,
    };
  }

  async findOrCreateByEmail(email: string): Promise<UserRecord> {
    const existing = await this.findByEmail(email);
    if (existing) return existing;
    return this.create({ email });
  }

  async setPassword(userId: string, plainPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(
      plainPassword,
      this.auth.passwordSaltRounds,
    );
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateProfile(
    userId: string,
    input: { fullName?: string },
  ): Promise<void> {
    await this.db
      .update(users)
      .set({ fullName: input.fullName, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async verifyPassword(
    user: UserRecord,
    plainPassword: string,
  ): Promise<boolean> {
    if (!user.passwordHash) return false;
    return bcrypt.compare(plainPassword, user.passwordHash);
  }

  async setTwoFactorSecret(
    userId: string,
    secret: string | null,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({ twoFactorSecret: secret, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async enableTwoFactor(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ twoFactorEnabled: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async disableTwoFactor(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }
}
