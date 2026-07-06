import {
  buildOtpauthUrl,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  verifyBackupCode,
  verifyTotpCode,
} from './two-factor.util';
import { authenticator } from 'otplib';

describe('two-factor.util', () => {
  describe('generateTotpSecret', () => {
    it('generates a non-empty base32 secret', () => {
      const secret = generateTotpSecret();
      expect(secret).toMatch(/^[A-Z2-7]+$/);
      expect(secret.length).toBeGreaterThan(0);
    });

    it('generates a different secret each call', () => {
      expect(generateTotpSecret()).not.toBe(generateTotpSecret());
    });
  });

  describe('buildOtpauthUrl', () => {
    it('builds a Google-Authenticator-compatible otpauth:// URI', () => {
      const secret = generateTotpSecret();
      const url = buildOtpauthUrl('owner@demo.test', secret, 'Boilerplate');
      expect(url).toMatch(/^otpauth:\/\/totp\//);
      expect(url).toContain(encodeURIComponent('owner@demo.test'));
      expect(url).toContain(`secret=${secret}`);
      expect(url).toContain('issuer=Boilerplate');
    });
  });

  describe('verifyTotpCode', () => {
    it('accepts a code generated from the same secret', () => {
      const secret = generateTotpSecret();
      const code = authenticator.generate(secret);
      expect(verifyTotpCode(secret, code)).toBe(true);
    });

    it('rejects a wrong code', () => {
      const secret = generateTotpSecret();
      expect(verifyTotpCode(secret, '000000')).toBe(false);
    });

    it('rejects a code generated from a different secret', () => {
      const secretA = generateTotpSecret();
      const secretB = generateTotpSecret();
      const codeForB = authenticator.generate(secretB);
      expect(verifyTotpCode(secretA, codeForB)).toBe(false);
    });

    it('returns false instead of throwing on malformed input', () => {
      expect(verifyTotpCode('not-a-real-secret', 'garbage')).toBe(false);
    });
  });

  describe('generateBackupCodes', () => {
    it('generates the requested number of codes', () => {
      expect(generateBackupCodes(5)).toHaveLength(5);
    });

    it('defaults to 10 codes', () => {
      expect(generateBackupCodes()).toHaveLength(10);
    });

    it('generates codes in the xxxxx-xxxxx format', () => {
      for (const code of generateBackupCodes(20)) {
        expect(code).toMatch(/^[0-9a-f]{5}-[0-9a-f]{5}$/);
      }
    });

    it('generates unique codes', () => {
      const codes = generateBackupCodes(50);
      expect(new Set(codes).size).toBe(codes.length);
    });
  });

  describe('hashBackupCode / verifyBackupCode', () => {
    it('round-trips: a hashed code verifies against its original plaintext', async () => {
      const [code] = generateBackupCodes(1);
      const hash = await hashBackupCode(code);
      expect(await verifyBackupCode(code, hash)).toBe(true);
    });

    it('rejects a different code against the hash', async () => {
      const [codeA] = generateBackupCodes(1);
      const [codeB] = generateBackupCodes(1);
      const hash = await hashBackupCode(codeA);
      expect(await verifyBackupCode(codeB, hash)).toBe(false);
    });

    it('does not store the plaintext code in the hash', async () => {
      const [code] = generateBackupCodes(1);
      const hash = await hashBackupCode(code);
      expect(hash).not.toContain(code);
    });
  });
});
