import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '../password';

describe('password utilities', () => {
  describe('hashPassword', () => {
    // UT-003-01: パスワードハッシュ化
    it('should generate a hash for valid password', async () => {
      const password = 'password123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hash for same password (due to salt)', async () => {
      const password = 'password123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate bcrypt format hash', async () => {
      const password = 'testPassword';
      const hash = await hashPassword(password);

      // bcrypt hash starts with $2a$, $2b$, or $2y$
      expect(hash).toMatch(/^\$2[aby]\$\d{1,2}\$.{53}$/);
    });

    it('should handle empty password', async () => {
      const password = '';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle long password', async () => {
      const password = 'a'.repeat(100);
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle special characters in password', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle unicode characters in password', async () => {
      const password = 'パスワード123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('verifyPassword', () => {
    // UT-003-02: ハッシュ検証（正しい）
    it('should return true for correct password', async () => {
      const password = 'password123';
      const hash = await hashPassword(password);
      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    // UT-003-03: ハッシュ検証（誤り）
    it('should return false for incorrect password', async () => {
      const password = 'password123';
      const wrongPassword = 'wrongpassword';
      const hash = await hashPassword(password);
      const result = await verifyPassword(wrongPassword, hash);

      expect(result).toBe(false);
    });

    it('should return false for similar but different password', async () => {
      const password = 'password123';
      const similarPassword = 'password124';
      const hash = await hashPassword(password);
      const result = await verifyPassword(similarPassword, hash);

      expect(result).toBe(false);
    });

    it('should return true for empty password when hashed correctly', async () => {
      const password = '';
      const hash = await hashPassword(password);
      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false when verifying empty password against non-empty hash', async () => {
      const password = 'password123';
      const hash = await hashPassword(password);
      const result = await verifyPassword('', hash);

      expect(result).toBe(false);
    });

    it('should handle special characters correctly', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hash = await hashPassword(password);
      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    it('should handle unicode characters correctly', async () => {
      const password = 'パスワード123';
      const hash = await hashPassword(password);
      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    it('should be case sensitive', async () => {
      const password = 'Password123';
      const hash = await hashPassword(password);

      expect(await verifyPassword('password123', hash)).toBe(false);
      expect(await verifyPassword('PASSWORD123', hash)).toBe(false);
      expect(await verifyPassword('Password123', hash)).toBe(true);
    });

    it('should handle whitespace correctly', async () => {
      const password = 'password with spaces';
      const hash = await hashPassword(password);

      expect(await verifyPassword('password with spaces', hash)).toBe(true);
      expect(await verifyPassword('passwordwithspaces', hash)).toBe(false);
      expect(await verifyPassword(' password with spaces', hash)).toBe(false);
    });
  });
});
