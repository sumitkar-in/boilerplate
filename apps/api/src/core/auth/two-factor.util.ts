import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_HASH_ROUNDS = 10;

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpauthUrl(
  accountEmail: string,
  secret: string,
  issuer: string,
): string {
  return authenticator.keyuri(accountEmail, issuer, secret);
}

export function generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyTotpCode(secret: string, code: string): boolean {
  try {
    return authenticator.verify({ token: code, secret });
  } catch {
    return false;
  }
}

// Human-typeable one-time recovery codes, e.g. "a1b2c-d3e4f".
export function generateBackupCodes(count = BACKUP_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString('hex');
    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
  });
}

export function hashBackupCode(code: string): Promise<string> {
  return bcrypt.hash(code, BACKUP_CODE_HASH_ROUNDS);
}

export function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}
