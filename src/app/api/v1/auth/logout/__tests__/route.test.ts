/**
 * POST /api/v1/auth/logout のテスト
 *
 * テスト仕様書 IT-002 に基づいた結合テスト
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '../route';

// JWT検証のモック
const mockVerifyToken = vi.fn();
const mockExtractTokenFromHeader = vi.fn();
vi.mock('@/lib/auth/jwt', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
  extractTokenFromHeader: (header: string | null) => mockExtractTokenFromHeader(header),
}));

// Cookie操作のモック
const mockClearAuthCookie = vi.fn();
vi.mock('@/lib/auth/cookie', () => ({
  clearAuthCookie: () => mockClearAuthCookie(),
}));

// Prismaのモック（middleware内で使用される可能性があるため）
vi.mock('@/lib/prisma', () => ({
  prisma: {
    salesPerson: {
      findUnique: vi.fn(),
    },
  },
}));

/**
 * リクエストを作成するヘルパー関数
 */
function createRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }
  return new NextRequest('http://localhost:3000/api/v1/auth/logout', {
    method: 'POST',
    headers,
  });
}

describe('POST /api/v1/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトのモック動作を設定
    mockClearAuthCookie.mockResolvedValue(undefined);
  });

  describe('IT-002-01: 正常ログアウト', () => {
    it('有効なトークンで200とログアウトメッセージが返される', async () => {
      // Arrange
      const validToken = 'valid.jwt.token';
      mockExtractTokenFromHeader.mockReturnValue(validToken);
      mockVerifyToken.mockResolvedValue({
        valid: true,
        payload: {
          userId: 1,
          email: 'yamada@example.com',
          role: 'member',
        },
      });

      const request = createRequest(`Bearer ${validToken}`);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        message: 'ログアウトしました',
      });

      // モックの呼び出しを検証
      expect(mockExtractTokenFromHeader).toHaveBeenCalledWith(`Bearer ${validToken}`);
      expect(mockVerifyToken).toHaveBeenCalledWith(validToken);
      expect(mockClearAuthCookie).toHaveBeenCalled();
    });

    it('managerロールのユーザーでも正常にログアウトできる', async () => {
      // Arrange
      const validToken = 'valid.jwt.token';
      mockExtractTokenFromHeader.mockReturnValue(validToken);
      mockVerifyToken.mockResolvedValue({
        valid: true,
        payload: {
          userId: 2,
          email: 'manager@example.com',
          role: 'manager',
        },
      });

      const request = createRequest(`Bearer ${validToken}`);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('ログアウトしました');
      expect(mockClearAuthCookie).toHaveBeenCalled();
    });

    it('adminロールのユーザーでも正常にログアウトできる', async () => {
      // Arrange
      const validToken = 'valid.jwt.token';
      mockExtractTokenFromHeader.mockReturnValue(validToken);
      mockVerifyToken.mockResolvedValue({
        valid: true,
        payload: {
          userId: 3,
          email: 'admin@example.com',
          role: 'admin',
        },
      });

      const request = createRequest(`Bearer ${validToken}`);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('ログアウトしました');
      expect(mockClearAuthCookie).toHaveBeenCalled();
    });
  });

  describe('IT-002-02: トークンなし', () => {
    it('Authorizationヘッダーなしで401とUNAUTHORIZEDが返される', async () => {
      // Arrange
      mockExtractTokenFromHeader.mockReturnValue(null);

      const request = createRequest(); // Authorizationヘッダーなし

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('認証が必要です');

      // clearAuthCookieは呼ばれない
      expect(mockClearAuthCookie).not.toHaveBeenCalled();
    });

    it('空のAuthorizationヘッダーで401とUNAUTHORIZEDが返される', async () => {
      // Arrange
      mockExtractTokenFromHeader.mockReturnValue(null);

      const request = createRequest('');

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');

      // clearAuthCookieは呼ばれない
      expect(mockClearAuthCookie).not.toHaveBeenCalled();
    });

    it('Bearer プレフィックスなしで401とUNAUTHORIZEDが返される', async () => {
      // Arrange
      mockExtractTokenFromHeader.mockReturnValue(null);

      const request = createRequest('some.token.without.bearer');

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');

      // clearAuthCookieは呼ばれない
      expect(mockClearAuthCookie).not.toHaveBeenCalled();
    });
  });

  describe('IT-002-03: 無効なトークン', () => {
    it('不正なトークンで401とUNAUTHORIZEDが返される', async () => {
      // Arrange
      const invalidToken = 'invalid.jwt.token';
      mockExtractTokenFromHeader.mockReturnValue(invalidToken);
      mockVerifyToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token signature',
      });

      const request = createRequest(`Bearer ${invalidToken}`);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('Invalid token signature');

      // clearAuthCookieは呼ばれない
      expect(mockClearAuthCookie).not.toHaveBeenCalled();
    });

    it('期限切れトークンで401とUNAUTHORIZEDが返される', async () => {
      // Arrange
      const expiredToken = 'expired.jwt.token';
      mockExtractTokenFromHeader.mockReturnValue(expiredToken);
      mockVerifyToken.mockResolvedValue({
        valid: false,
        error: 'Token has expired',
      });

      const request = createRequest(`Bearer ${expiredToken}`);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('Token has expired');

      // clearAuthCookieは呼ばれない
      expect(mockClearAuthCookie).not.toHaveBeenCalled();
    });

    it('改ざんされたトークンで401とUNAUTHORIZEDが返される', async () => {
      // Arrange
      const tamperedToken = 'tampered.jwt.token';
      mockExtractTokenFromHeader.mockReturnValue(tamperedToken);
      mockVerifyToken.mockResolvedValue({
        valid: false,
        error: 'Token verification failed',
      });

      const request = createRequest(`Bearer ${tamperedToken}`);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');

      // clearAuthCookieは呼ばれない
      expect(mockClearAuthCookie).not.toHaveBeenCalled();
    });

    it('不正な形式のトークンで401とUNAUTHORIZEDが返される', async () => {
      // Arrange
      const malformedToken = 'malformed';
      mockExtractTokenFromHeader.mockReturnValue(malformedToken);
      mockVerifyToken.mockResolvedValue({
        valid: false,
        error: 'Token is malformed',
      });

      const request = createRequest(`Bearer ${malformedToken}`);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');

      // clearAuthCookieは呼ばれない
      expect(mockClearAuthCookie).not.toHaveBeenCalled();
    });
  });

  describe('Cookie削除の確認', () => {
    it('ログアウト成功時にclearAuthCookieが正しく呼び出される', async () => {
      // Arrange
      const validToken = 'valid.jwt.token';
      mockExtractTokenFromHeader.mockReturnValue(validToken);
      mockVerifyToken.mockResolvedValue({
        valid: true,
        payload: {
          userId: 1,
          email: 'test@example.com',
          role: 'member',
        },
      });

      const request = createRequest(`Bearer ${validToken}`);

      // Act
      await POST(request);

      // Assert
      expect(mockClearAuthCookie).toHaveBeenCalledTimes(1);
    });
  });
});
