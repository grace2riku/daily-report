import { describe, expect, it } from 'vitest';

import { extractToken, generateToken, verifyToken } from '../jwt';

describe('JWT ユーティリティ', () => {
  describe('generateToken', () => {
    it('有効なJWTトークンを生成する', async () => {
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'member',
      };

      const { token, expiresAt } = await generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT は 3 つの部分で構成される
      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('異なるユーザーに対して異なるトークンを生成する', async () => {
      const { token: token1 } = await generateToken({
        userId: 1,
        email: 'user1@example.com',
        role: 'member',
      });

      const { token: token2 } = await generateToken({
        userId: 2,
        email: 'user2@example.com',
        role: 'manager',
      });

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('有効なトークンを検証してペイロードを返す', async () => {
      const originalPayload = {
        userId: 1,
        email: 'test@example.com',
        role: 'member',
      };

      const { token } = await generateToken(originalPayload);
      const payload = await verifyToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(originalPayload.userId);
      expect(payload?.email).toBe(originalPayload.email);
      expect(payload?.role).toBe(originalPayload.role);
      expect(payload?.iat).toBeDefined();
      expect(payload?.exp).toBeDefined();
    });

    it('無効なトークンに対して null を返す', async () => {
      const invalidToken = 'invalid.token.here';
      const payload = await verifyToken(invalidToken);

      expect(payload).toBeNull();
    });

    it('改ざんされたトークンに対して null を返す', async () => {
      const { token } = await generateToken({
        userId: 1,
        email: 'test@example.com',
        role: 'member',
      });

      // トークンの署名部分を改ざん
      const parts = token.split('.');
      parts[2] = 'tampered_signature';
      const tamperedToken = parts.join('.');

      const payload = await verifyToken(tamperedToken);

      expect(payload).toBeNull();
    });

    it('空文字のトークンに対して null を返す', async () => {
      const payload = await verifyToken('');

      expect(payload).toBeNull();
    });
  });

  describe('extractToken', () => {
    it('Authorization ヘッダーから Bearer トークンを抽出する', () => {
      const token = 'test-jwt-token';
      const request = new Request('http://localhost', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const extractedToken = extractToken(request);

      expect(extractedToken).toBe(token);
    });

    it('Cookie からトークンを抽出する', () => {
      const token = 'cookie-jwt-token';
      const request = new Request('http://localhost', {
        headers: {
          Cookie: `token=${token}; other=value`,
        },
      });

      const extractedToken = extractToken(request);

      expect(extractedToken).toBe(token);
    });

    it('Authorization ヘッダーが Cookie より優先される', () => {
      const authToken = 'auth-token';
      const cookieToken = 'cookie-token';
      const request = new Request('http://localhost', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Cookie: `token=${cookieToken}`,
        },
      });

      const extractedToken = extractToken(request);

      expect(extractedToken).toBe(authToken);
    });

    it('Bearer プレフィックスがない場合は null を返す', () => {
      const request = new Request('http://localhost', {
        headers: {
          Authorization: 'Basic some-token',
        },
      });

      const extractedToken = extractToken(request);

      expect(extractedToken).toBeNull();
    });

    it('トークンがない場合は null を返す', () => {
      const request = new Request('http://localhost');

      const extractedToken = extractToken(request);

      expect(extractedToken).toBeNull();
    });

    it('Cookie に token がない場合は null を返す', () => {
      const request = new Request('http://localhost', {
        headers: {
          Cookie: 'other=value; another=test',
        },
      });

      const extractedToken = extractToken(request);

      expect(extractedToken).toBeNull();
    });
  });
});
