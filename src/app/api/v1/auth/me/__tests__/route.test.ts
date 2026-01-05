/**
 * GET /api/v1/auth/me APIのテスト
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { generateToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';
import type { JwtPayload } from '@/types';

import { GET } from '../route';

// Prisma モック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    salesPerson: {
      findUnique: vi.fn(),
    },
  },
}));

const TEST_SECRET = 'test-secret-key-for-testing-only-32-chars';

// モックデータ（managerリレーション付き）
const mockMemberWithManager = {
  id: 1,
  employeeCode: 'EMP001',
  name: '山田太郎',
  email: 'yamada@example.com',
  role: 'member' as const,
  managerId: 3,
  isActive: true,
  manager: {
    id: 3,
    name: '佐藤次郎',
  },
};

const mockManager = {
  id: 3,
  employeeCode: 'EMP003',
  name: '佐藤次郎',
  email: 'sato@example.com',
  role: 'manager' as const,
  managerId: null,
  isActive: true,
  manager: null,
};

const mockAdmin = {
  id: 4,
  employeeCode: 'EMP004',
  name: 'テスト管理者',
  email: 'admin@example.com',
  role: 'admin' as const,
  managerId: null,
  isActive: true,
  manager: null,
};

const mockDisabledUser = {
  id: 5,
  employeeCode: 'EMP005',
  name: '無効ユーザー',
  email: 'disabled@example.com',
  role: 'member' as const,
  managerId: null,
  isActive: false,
  manager: null,
};

/**
 * テスト用のリクエストを作成
 */
function createRequest(token?: string): NextRequest {
  const url = 'http://localhost:3000/api/v1/auth/me';

  if (token) {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', `Bearer ${token}`);

    return new NextRequest(url, {
      method: 'GET',
      headers,
    });
  }

  return new NextRequest(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('GET /api/v1/auth/me', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('IT-003-01: 有効なトークンでユーザー情報取得', () => {
    it('一般営業のユーザー情報と上長情報を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockMemberWithManager as never);

      const payload: JwtPayload = {
        userId: mockMemberWithManager.id,
        email: mockMemberWithManager.email,
        role: mockMemberWithManager.role,
      };
      const token = await generateToken(payload);

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
      findUniqueMock.mockResolvedValueOnce(mockManager as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

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
      findUniqueMock.mockResolvedValueOnce(mockAdmin as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      };
      const token = await generateToken(payload);

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
      expect(data.error.message).toBe('認証が必要です');
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
    });

    it('改竄されたトークンでエラーを返す', async () => {
      const payload: JwtPayload = {
        userId: 1,
        email: 'test@example.com',
        role: 'member',
      };
      const token = await generateToken(payload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      const request = createRequest(tamperedToken);
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

      const payload: JwtPayload = {
        userId: 999, // 存在しないユーザーID
        email: 'notexist@example.com',
        role: 'member',
      };
      const token = await generateToken(payload);

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
      findUniqueMock.mockResolvedValueOnce(mockDisabledUser as never);

      const payload: JwtPayload = {
        userId: mockDisabledUser.id,
        email: mockDisabledUser.email,
        role: mockDisabledUser.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ACCOUNT_DISABLED');
      expect(data.error.message).toBe('アカウントが無効化されています');
    });
  });

  describe('追加テスト: 上長情報が存在しない場合', () => {
    it('managerId が設定されているが上長リレーションがnullの場合', async () => {
      const memberWithoutManager = {
        ...mockMemberWithManager,
        managerId: 999, // 削除された上長
        manager: null, // リレーションがnull
      };

      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(memberWithoutManager as never);

      const payload: JwtPayload = {
        userId: memberWithoutManager.id,
        email: memberWithoutManager.email,
        role: memberWithoutManager.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.manager).toBeNull();
    });
  });
});
