import { Logger } from '@nestjs/common';
import { registerAs } from '@nestjs/config';

// Dev-only fallback — env.validation.ts refuses to boot production
// without a real JWT_SECRET, so this can never sign production tokens.
const DEV_JWT_SECRET = 'dev-only-insecure-jwt-secret';

export const authConfig = registerAs('auth', () => {
  if (!process.env.JWT_SECRET) {
    new Logger('AuthConfig').warn(
      'JWT_SECRET is not set — using an insecure development-only secret',
    );
  }
  return {
    jwtSecret: process.env.JWT_SECRET ?? DEV_JWT_SECRET,
    accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900), // 15m
    refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
    twoFactorPendingTtlSeconds: 300, // 5m window to complete a 2FA login
    inviteTtlDays: 7,
    passwordSaltRounds: 12,
  };
});

export type AuthConfig = ReturnType<typeof authConfig>;
