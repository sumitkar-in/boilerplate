import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { appConfig, type AppConfig } from '../config';
import { CORE_DB, type CoreDb } from '../database/database.providers';
import { twoFactorBackupCodes } from '../database/schema/core-schema';
import { UsersService, type UserRecord } from '../users/users.service';
import {
  buildOtpauthUrl,
  generateBackupCodes,
  generateQrCodeDataUrl,
  generateTotpSecret,
  hashBackupCode,
  verifyBackupCode,
  verifyTotpCode,
} from './two-factor.util';

@Injectable()
export class TwoFactorService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    private readonly usersService: UsersService,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
  ) {}

  async setup(
    user: UserRecord,
  ): Promise<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }> {
    const secret = generateTotpSecret();
    // Stored with two_factor_enabled still false — "setup in progress"
    // until confirmEnable() verifies a code.
    await this.usersService.setTwoFactorSecret(user.id, secret);
    const otpauthUrl = buildOtpauthUrl(user.email, secret, this.app.name);
    const qrCodeDataUrl = await generateQrCodeDataUrl(otpauthUrl);
    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  async confirmEnable(
    user: UserRecord,
    code: string,
  ): Promise<{ backupCodes: string[] }> {
    if (!user.twoFactorSecret) {
      throw new BadRequestException('Call /auth/2fa/setup first');
    }
    if (!verifyTotpCode(user.twoFactorSecret, code)) {
      throw new UnauthorizedException('Invalid code');
    }

    await this.usersService.enableTwoFactor(user.id);

    const plainCodes = generateBackupCodes();
    const rows = await Promise.all(
      plainCodes.map(async (plainCode) => ({
        userId: user.id,
        codeHash: await hashBackupCode(plainCode),
      })),
    );
    await this.db.insert(twoFactorBackupCodes).values(rows);

    return { backupCodes: plainCodes };
  }

  async disable(user: UserRecord): Promise<void> {
    await this.usersService.disableTwoFactor(user.id);
    await this.db
      .delete(twoFactorBackupCodes)
      .where(eq(twoFactorBackupCodes.userId, user.id));
  }

  async verifyLoginCode(user: UserRecord, code: string): Promise<boolean> {
    if (user.twoFactorSecret && verifyTotpCode(user.twoFactorSecret, code)) {
      return true;
    }
    return this.tryConsumeBackupCode(user.id, code);
  }

  private async tryConsumeBackupCode(
    userId: string,
    code: string,
  ): Promise<boolean> {
    const candidates = await this.db
      .select()
      .from(twoFactorBackupCodes)
      .where(
        and(
          eq(twoFactorBackupCodes.userId, userId),
          isNull(twoFactorBackupCodes.usedAt),
        ),
      );

    for (const candidate of candidates) {
      if (await verifyBackupCode(code, candidate.codeHash)) {
        await this.db
          .update(twoFactorBackupCodes)
          .set({ usedAt: new Date() })
          .where(eq(twoFactorBackupCodes.id, candidate.id));
        return true;
      }
    }
    return false;
  }
}
