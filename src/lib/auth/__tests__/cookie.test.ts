/**
 * Cookie操作ヘルパーのテスト
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  setAuthCookie,
  getAuthCookie,
  clearAuthCookie,
  hasAuthCookie,
  AUTH_COOKIE_CONFIG,
} from '../cookie';
import { JWT_CONFIG } from '../jwt';

// next/headers のモック
const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookies)),
}));

describe('Cookie 操作ヘルパー', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AUTH_COOKIE_CONFIG', () => {
    it('正しい設定値を持つ', () => {
      expect(AUTH_COOKIE_CONFIG.name).toBe('auth_token');
      expect(AUTH_COOKIE_CONFIG.maxAge).toBe(JWT_CONFIG.EXPIRES_IN_SECONDS);
      expect(AUTH_COOKIE_CONFIG.httpOnly).toBe(true);
      expect(AUTH_COOKIE_CONFIG.sameSite).toBe('lax');
      expect(AUTH_COOKIE_CONFIG.path).toBe('/');
    });

    it('本番環境ではSecure属性がtrueになる', () => {
      // このテストは実行時の環境に依存する
      // NODE_ENVがproductionの場合はtrue、それ以外はfalse
      const expectedSecure = process.env.NODE_ENV === 'production';
      expect(AUTH_COOKIE_CONFIG.secure).toBe(expectedSecure);
    });
  });

  describe('setAuthCookie', () => {
    it('トークンをCookieに設定する', async () => {
      const token = 'test-jwt-token';

      await setAuthCookie(token);

      expect(mockCookies.set).toHaveBeenCalledWith(
        AUTH_COOKIE_CONFIG.name,
        token,
        {
          maxAge: AUTH_COOKIE_CONFIG.maxAge,
          httpOnly: AUTH_COOKIE_CONFIG.httpOnly,
          secure: AUTH_COOKIE_CONFIG.secure,
          sameSite: AUTH_COOKIE_CONFIG.sameSite,
          path: AUTH_COOKIE_CONFIG.path,
        }
      );
    });

    it('空のトークンも設定できる', async () => {
      const token = '';

      await setAuthCookie(token);

      expect(mockCookies.set).toHaveBeenCalledWith(
        AUTH_COOKIE_CONFIG.name,
        token,
        expect.any(Object)
      );
    });
  });

  describe('getAuthCookie', () => {
    it('Cookieからトークンを取得する', async () => {
      const expectedToken = 'stored-jwt-token';
      mockCookies.get.mockReturnValue({ value: expectedToken });

      const token = await getAuthCookie();

      expect(mockCookies.get).toHaveBeenCalledWith(AUTH_COOKIE_CONFIG.name);
      expect(token).toBe(expectedToken);
    });

    it('Cookieが存在しない場合はundefinedを返す', async () => {
      mockCookies.get.mockReturnValue(undefined);

      const token = await getAuthCookie();

      expect(token).toBeUndefined();
    });

    it('Cookieの値が空の場合は空文字列を返す', async () => {
      mockCookies.get.mockReturnValue({ value: '' });

      const token = await getAuthCookie();

      expect(token).toBe('');
    });
  });

  describe('clearAuthCookie', () => {
    it('CookieのmaxAgeを0に設定して削除する', async () => {
      await clearAuthCookie();

      expect(mockCookies.set).toHaveBeenCalledWith(
        AUTH_COOKIE_CONFIG.name,
        '',
        {
          maxAge: 0,
          httpOnly: AUTH_COOKIE_CONFIG.httpOnly,
          secure: AUTH_COOKIE_CONFIG.secure,
          sameSite: AUTH_COOKIE_CONFIG.sameSite,
          path: AUTH_COOKIE_CONFIG.path,
        }
      );
    });
  });

  describe('hasAuthCookie', () => {
    it('Cookieが存在する場合はtrueを返す', async () => {
      mockCookies.get.mockReturnValue({ value: 'some-token' });

      const result = await hasAuthCookie();

      expect(result).toBe(true);
    });

    it('Cookieが存在しない場合はfalseを返す', async () => {
      mockCookies.get.mockReturnValue(undefined);

      const result = await hasAuthCookie();

      expect(result).toBe(false);
    });

    it('Cookieの値が空の場合はfalseを返す', async () => {
      mockCookies.get.mockReturnValue({ value: '' });

      const result = await hasAuthCookie();

      expect(result).toBe(false);
    });
  });
});
