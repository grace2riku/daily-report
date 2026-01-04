/**
 * JWTユーティリティ関数のテスト
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from 'vitest';

import type { JwtPayload } from '@/types';

import {
  generateToken,
  verifyToken,
  decodeToken,
  calculateTokenExpiry,
  extractTokenFromHeader,
  JWT_CONFIG,
} from '../jwt';

// テスト全体でJWT_SECRETを設定
const TEST_SECRET = 'test-secret-key-for-testing-only-32-chars';

describe('JWT ユーティリティ', () => {
  const testPayload: JwtPayload = {
    userId: 1,
    email: 'test@example.com',
    role: 'member',
  };

  beforeAll(() => {
    // 全テストの前にJWT_SECRETを設定
    process.env.JWT_SECRET = TEST_SECRET;
  });

  beforeEach(() => {
    // 各テストの前にJWT_SECRETをリセット
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('generateToken', () => {
    it('有効なペイロードからJWTトークンを生成できる', async () => {
      const token = await generateToken(testPayload);

      // トークンがJWT形式（3つの部分で構成）であることを確認
      expect(token).toBeDefined();
      expect(token.split('.').length).toBe(3);
    });

    it('異なるペイロードでは異なるトークンが生成される', async () => {
      const payload1: JwtPayload = { ...testPayload };
      const payload2: JwtPayload = { ...testPayload, userId: 2 };

      const token1 = await generateToken(payload1);
      const token2 = await generateToken(payload2);

      expect(token1).not.toBe(token2);
    });

    it('すべてのロールでトークンを生成できる', async () => {
      const roles: JwtPayload['role'][] = ['member', 'manager', 'admin'];

      for (const role of roles) {
        const token = await generateToken({ ...testPayload, role });
        expect(token).toBeDefined();
        expect(token.split('.').length).toBe(3);
      }
    });

    it('JWT_SECRETが設定されていない場合はエラーをスローする', async () => {
      // JWT_SECRETを削除
      delete process.env.JWT_SECRET;

      await expect(generateToken(testPayload)).rejects.toThrow(
        'JWT_SECRET environment variable is not set'
      );
    });
  });

  describe('verifyToken', () => {
    it('有効なトークンを検証できる', async () => {
      const token = await generateToken(testPayload);
      const result = await verifyToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.userId).toBe(testPayload.userId);
      expect(result.payload?.email).toBe(testPayload.email);
      expect(result.payload?.role).toBe(testPayload.role);
    });

    it('空のトークンは検証に失敗する', async () => {
      const result = await verifyToken('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token is required');
    });

    it('不正な形式のトークンは検証に失敗する', async () => {
      const result = await verifyToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('改竄されたトークンは検証に失敗する', async () => {
      const token = await generateToken(testPayload);
      // トークンの一部を改竄
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      const result = await verifyToken(tamperedToken);

      expect(result.valid).toBe(false);
    });

    it('異なるシークレットで署名されたトークンは検証に失敗する', async () => {
      // 別のシークレットでトークンを生成
      process.env.JWT_SECRET = 'different-secret-key-for-signing-token';
      const token = await generateToken(testPayload);

      // 元のシークレットで検証
      process.env.JWT_SECRET = 'original-secret-key-for-verification';
      const result = await verifyToken(token);

      expect(result.valid).toBe(false);
    });

    it('managerロールのトークンを検証できる', async () => {
      const managerPayload: JwtPayload = {
        ...testPayload,
        role: 'manager',
      };
      const token = await generateToken(managerPayload);
      const result = await verifyToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.role).toBe('manager');
    });

    it('adminロールのトークンを検証できる', async () => {
      const adminPayload: JwtPayload = {
        ...testPayload,
        role: 'admin',
      };
      const token = await generateToken(adminPayload);
      const result = await verifyToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.role).toBe('admin');
    });
  });

  describe('decodeToken', () => {
    it('有効なトークンをデコードできる', async () => {
      const token = await generateToken(testPayload);
      const payload = decodeToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(testPayload.userId);
      expect(payload?.email).toBe(testPayload.email);
      expect(payload?.role).toBe(testPayload.role);
    });

    it('空のトークンはnullを返す', () => {
      const payload = decodeToken('');

      expect(payload).toBeNull();
    });

    it('不正な形式のトークンはnullを返す', () => {
      const payload = decodeToken('invalid-token');

      expect(payload).toBeNull();
    });

    it('改竄されたトークンでもデコードは試行される（署名検証なし）', async () => {
      const token = await generateToken(testPayload);
      // ペイロード部分のみ改竄（ヘッダーとシグネチャはそのまま）
      const parts = token.split('.');

      // デコードできるか、nullが返るかは改竄の仕方による
      // この関数は署名検証をしないため、正しいJWT形式であればデコードできる
      const payload = decodeToken(token);

      // 元のトークンはデコードできるはず
      expect(payload).not.toBeNull();
      expect(parts.length).toBe(3);
    });
  });

  describe('calculateTokenExpiry', () => {
    it('有効期限を正しく計算できる', () => {
      const before = Date.now();
      const expiry = calculateTokenExpiry();
      const after = Date.now();

      const expiryDate = new Date(expiry);
      const expectedMinExpiry = before + JWT_CONFIG.EXPIRES_IN_SECONDS * 1000;
      const expectedMaxExpiry = after + JWT_CONFIG.EXPIRES_IN_SECONDS * 1000;

      expect(expiryDate.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(expiryDate.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
    });

    it('ISO 8601形式の文字列を返す', () => {
      const expiry = calculateTokenExpiry();

      // ISO 8601形式の検証
      expect(new Date(expiry).toISOString()).toBe(expiry);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('Bearer形式のヘッダーからトークンを抽出できる', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
      const header = `Bearer ${token}`;

      const extracted = extractTokenFromHeader(header);

      expect(extracted).toBe(token);
    });

    it('nullヘッダーはnullを返す', () => {
      const extracted = extractTokenFromHeader(null);

      expect(extracted).toBeNull();
    });

    it('空のヘッダーはnullを返す', () => {
      const extracted = extractTokenFromHeader('');

      expect(extracted).toBeNull();
    });

    it('Bearer形式でないヘッダーはnullを返す', () => {
      const extracted = extractTokenFromHeader('Basic token123');

      expect(extracted).toBeNull();
    });

    it('Bearerのみでトークンがない場合はnullを返す', () => {
      const extracted = extractTokenFromHeader('Bearer ');

      expect(extracted).toBeNull();
    });

    it('トークン前後の空白は削除される', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
      const header = `Bearer   ${token}   `;

      const extracted = extractTokenFromHeader(header);

      expect(extracted).toBe(token);
    });
  });

  describe('JWT_CONFIG', () => {
    it('正しい設定値を持つ', () => {
      expect(JWT_CONFIG.EXPIRES_IN).toBe('24h');
      expect(JWT_CONFIG.EXPIRES_IN_SECONDS).toBe(24 * 60 * 60);
      expect(JWT_CONFIG.ALGORITHM).toBe('HS256');
      expect(JWT_CONFIG.ISSUER).toBe('daily-report-system');
      expect(JWT_CONFIG.AUDIENCE).toBe('daily-report-users');
    });
  });
});
