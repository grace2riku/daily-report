import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateToken } from '@/lib/auth/jwt';
import prisma from '@/lib/prisma';

import { GET } from '../route';

// Prisma モック
vi.mock('@/lib/prisma', () => ({
  default: {
    salesPerson: {
      findUnique: vi.fn(),
    },
  },
}));

// モックデータ
const mockMember = {
  id: 1,
  employeeCode: 'EMP001',
  name: '山田太郎',
  email: 'yamada@example.com',
  role: 'member' as const,
  managerId: 3,
  isActive: true,
  passwordHash: 'hashed_password',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

const mockManager = {
  id: 3,
  employeeCode: 'EMP003',
  name: '佐藤次郎',
  email: 'sato@example.com',
  role: 'manager' as const,
  managerId: null,
  isActive: true,
  passwordHash: 'hashed_password',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

const mockAdmin = {
  id: 4,
  employeeCode: 'EMP004',
  name: 'テスト管理者',
  email: 'admin@example.com',
  role: 'admin' as const,
  managerId: null,
  isActive: true,
  passwordHash: 'hashed_password',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

const mockDisabledUser = {
  id: 5,
  employeeCode: 'EMP005',
  name: '無効ユーザー',
  email: 'disabled@example.com',
  role: 'member' as const,
  managerId: null,
  isActive: false,
  passwordHash: 'hashed_password',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

/**
 * テスト用のリクエストを作成
 */
function createRequest(token?: string): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return new NextRequest('http://localhost:3000/api/v1/auth/me', {
    method: 'GET',
    headers,
  });
}

describe('GET /api/v1/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('IT-003-01: 有効なトークンでユーザー情報取得', () => {
    it('一般営業のユーザー情報と上長情報を返す', async () => {
      // モック設定: 最初の呼び出しでユーザー情報、2回目で上長情報を返す
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockMember).mockResolvedValueOnce(mockManager);

      const { token } = await generateToken({
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      });

      const request = createRequest(token);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        id: 1,
        employee_code: 'EMP001',
        name: '山田太郎',
        email: 'yamada@example.com',
        role: 'member',
        manager: {
          id: 3,
          name: '佐藤次郎',
        },
      });
    });

    it('上長のユーザー情報を返す（上長情報なし）', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockManager);

      const { token } = await generateToken({
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      });

      const request = createRequest(token);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        id: 3,
        employee_code: 'EMP003',
        name: '佐藤次郎',
        email: 'sato@example.com',
        role: 'manager',
        manager: null,
      });
    });

    it('管理者のユーザー情報を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockAdmin);

      const { token } = await generateToken({
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      });

      const request = createRequest(token);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        id: 4,
        employee_code: 'EMP004',
        name: 'テスト管理者',
        email: 'admin@example.com',
        role: 'admin',
        manager: null,
      });
    });
  });

  describe('IT-003-02: トークンなし', () => {
    it('認証エラーを返す', async () => {
      const request = createRequest(); // トークンなし
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('認証トークンが必要です');
    });
  });

  describe('追加テスト: 無効なトークン', () => {
    it('不正なフォーマットのトークンでエラーを返す', async () => {
      const request = createRequest('invalid-token-format');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('無効なトークンです');
    });

    it('期限切れトークンでエラーを返す', async () => {
      // 期限切れトークンをシミュレート（実際の期限切れトークンをテストするのは難しいので、
      // 無効なトークンと同じ挙動になることを確認）
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJtZW1iZXIiLCJleHAiOjE2MDAwMDAwMDB9.invalid';
      const request = createRequest(expiredToken);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('追加テスト: ユーザーが存在しない場合', () => {
    it('ユーザーが見つからない場合はエラーを返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(null);

      const { token } = await generateToken({
        userId: 999, // 存在しないユーザーID
        email: 'notexist@example.com',
        role: 'member',
      });

      const request = createRequest(token);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('ユーザーが見つかりません');
    });
  });

  describe('追加テスト: アカウントが無効化されている場合', () => {
    it('無効化されたアカウントの場合はエラーを返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockDisabledUser);

      const { token } = await generateToken({
        userId: mockDisabledUser.id,
        email: mockDisabledUser.email,
        role: mockDisabledUser.role,
      });

      const request = createRequest(token);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ACCOUNT_DISABLED');
      expect(data.error.message).toBe('アカウントが無効化されています');
    });
  });

  describe('追加テスト: Cookie からトークンを取得', () => {
    it('Cookie にトークンがある場合はユーザー情報を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockManager);

      const { token } = await generateToken({
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      });

      const request = new NextRequest('http://localhost:3000/api/v1/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${token}`,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(3);
    });
  });

  describe('追加テスト: 上長情報が存在しない場合', () => {
    it('managerId が設定されているが上長が削除されている場合', async () => {
      const memberWithDeletedManager = {
        ...mockMember,
        managerId: 999, // 削除された上長
      };

      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(memberWithDeletedManager).mockResolvedValueOnce(null); // 上長が見つからない

      const { token } = await generateToken({
        userId: memberWithDeletedManager.id,
        email: memberWithDeletedManager.email,
        role: memberWithDeletedManager.role,
      });

      const request = createRequest(token);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.manager).toBeNull();
    });
  });
});
