/**
 * POST /api/v1/auth/login のテスト
 *
 * テスト仕様書 IT-001 に基づいた結合テスト
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '../route';

// Prismaのモック
const mockFindUnique = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    salesPerson: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

// パスワード検証のモック
const mockVerifyPassword = vi.fn();
vi.mock('@/lib/utils/password', () => ({
  verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
}));

// JWT関連のモック
const mockGenerateToken = vi.fn();
const mockCalculateTokenExpiry = vi.fn();
vi.mock('@/lib/auth/jwt', () => ({
  generateToken: (...args: unknown[]) => mockGenerateToken(...args),
  calculateTokenExpiry: () => mockCalculateTokenExpiry(),
}));

// Cookie操作のモック
const mockSetAuthCookie = vi.fn();
vi.mock('@/lib/auth/cookie', () => ({
  setAuthCookie: (...args: unknown[]) => mockSetAuthCookie(...args),
}));

// テスト用のモックユーザーデータ
const mockActiveUser = {
  id: 1,
  employeeCode: 'EMP001',
  name: '山田太郎',
  email: 'yamada@example.com',
  passwordHash: '$2b$10$hashedpassword',
  role: 'member' as const,
  isActive: true,
  managerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDisabledUser = {
  ...mockActiveUser,
  id: 2,
  employeeCode: 'EMP002',
  name: '無効ユーザー',
  email: 'disabled@example.com',
  isActive: false,
};

/**
 * リクエストを作成するヘルパー関数
 */
function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトのモック動作を設定
    mockGenerateToken.mockResolvedValue('mock.jwt.token');
    mockCalculateTokenExpiry.mockReturnValue('2025-01-16T10:00:00.000Z');
    mockSetAuthCookie.mockResolvedValue(undefined);
  });

  describe('IT-001-01: 正常ログイン', () => {
    it('有効なemail/passwordで200とトークンが返される', async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(mockActiveUser);
      mockVerifyPassword.mockResolvedValue(true);

      const request = createRequest({
        email: 'yamada@example.com',
        password: 'password123',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        token: 'mock.jwt.token',
        expires_at: '2025-01-16T10:00:00.000Z',
        user: {
          id: 1,
          employee_code: 'EMP001',
          name: '山田太郎',
          email: 'yamada@example.com',
          role: 'member',
        },
      });

      // モックの呼び出しを検証
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: 'yamada@example.com' },
      });
      expect(mockVerifyPassword).toHaveBeenCalledWith('password123', mockActiveUser.passwordHash);
      expect(mockGenerateToken).toHaveBeenCalledWith({
        userId: 1,
        email: 'yamada@example.com',
        role: 'member',
      });
      expect(mockSetAuthCookie).toHaveBeenCalledWith('mock.jwt.token');
    });
  });

  describe('IT-001-02: メールアドレス誤り（存在しないメール）', () => {
    it('存在しないemailで401とINVALID_CREDENTIALSが返される', async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null);

      const request = createRequest({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
      expect(data.error.message).toBe('メールアドレスまたはパスワードが正しくありません');

      // パスワード検証は呼ばれない
      expect(mockVerifyPassword).not.toHaveBeenCalled();
    });
  });

  describe('IT-001-03: パスワード誤り', () => {
    it('誤ったpasswordで401とINVALID_CREDENTIALSが返される', async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(mockActiveUser);
      mockVerifyPassword.mockResolvedValue(false);

      const request = createRequest({
        email: 'yamada@example.com',
        password: 'wrongpassword',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
      expect(data.error.message).toBe('メールアドレスまたはパスワードが正しくありません');

      // パスワード検証は呼ばれる
      expect(mockVerifyPassword).toHaveBeenCalledWith('wrongpassword', mockActiveUser.passwordHash);

      // トークン生成は呼ばれない
      expect(mockGenerateToken).not.toHaveBeenCalled();
    });
  });

  describe('IT-001-04: 無効化アカウント（is_active=false）', () => {
    it('is_active=falseのユーザーで401とACCOUNT_DISABLEDが返される', async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(mockDisabledUser);

      const request = createRequest({
        email: 'disabled@example.com',
        password: 'password123',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ACCOUNT_DISABLED');
      expect(data.error.message).toBe('アカウントが無効化されています');

      // パスワード検証は呼ばれない（is_activeチェックが先）
      expect(mockVerifyPassword).not.toHaveBeenCalled();
    });
  });

  describe('IT-001-05: メールアドレス未入力', () => {
    it('email: ""で422とVALIDATION_ERRORが返される', async () => {
      // Arrange
      const request = createRequest({
        email: '',
        password: 'password123',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('メールアドレスを入力してください');

      // DBアクセスは行われない
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it('emailフィールドがない場合も422とVALIDATION_ERRORが返される', async () => {
      // Arrange
      const request = createRequest({
        password: 'password123',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('IT-001-06: パスワード未入力', () => {
    it('password: ""で422とVALIDATION_ERRORが返される', async () => {
      // Arrange
      const request = createRequest({
        email: 'yamada@example.com',
        password: '',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('パスワードを入力してください');

      // DBアクセスは行われない
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it('passwordフィールドがない場合も422とVALIDATION_ERRORが返される', async () => {
      // Arrange
      const request = createRequest({
        email: 'yamada@example.com',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('その他のバリデーションエラー', () => {
    it('無効なメールアドレス形式で422とVALIDATION_ERRORが返される', async () => {
      // Arrange
      const request = createRequest({
        email: 'invalid-email',
        password: 'password123',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('有効なメールアドレスを入力してください');
    });

    it('メールアドレスが長すぎる場合422とVALIDATION_ERRORが返される', async () => {
      // Arrange
      const longEmail = 'a'.repeat(250) + '@example.com';
      const request = createRequest({
        email: longEmail,
        password: 'password123',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('パスワードが長すぎる場合422とVALIDATION_ERRORが返される', async () => {
      // Arrange
      const request = createRequest({
        email: 'yamada@example.com',
        password: 'a'.repeat(101),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('エラーハンドリング', () => {
    it('不正なJSONでBAD_REQUESTが返される', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('BAD_REQUEST');
    });

    it('データベースエラーでINTERNAL_ERRORが返される', async () => {
      // Arrange
      mockFindUnique.mockRejectedValue(new Error('Database connection failed'));

      const request = createRequest({
        email: 'yamada@example.com',
        password: 'password123',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('ロールごとの動作確認', () => {
    it('managerロールのユーザーで正常ログインできる', async () => {
      // Arrange
      const managerUser = { ...mockActiveUser, role: 'manager' as const };
      mockFindUnique.mockResolvedValue(managerUser);
      mockVerifyPassword.mockResolvedValue(true);

      const request = createRequest({
        email: 'yamada@example.com',
        password: 'password123',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.user.role).toBe('manager');
    });

    it('adminロールのユーザーで正常ログインできる', async () => {
      // Arrange
      const adminUser = { ...mockActiveUser, role: 'admin' as const };
      mockFindUnique.mockResolvedValue(adminUser);
      mockVerifyPassword.mockResolvedValue(true);

      const request = createRequest({
        email: 'yamada@example.com',
        password: 'password123',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.user.role).toBe('admin');
    });
  });
});
