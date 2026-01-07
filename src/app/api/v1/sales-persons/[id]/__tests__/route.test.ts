/**
 * GET /api/v1/sales-persons/{id} APIのテスト
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

// モックデータ: 営業担当者
const mockMember = {
  id: 1,
  employeeCode: 'EMP001',
  name: 'テスト太郎',
  email: 'member@example.com',
  role: 'member' as const,
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-10T00:00:00Z'),
  manager: {
    id: 3,
    name: 'テスト課長',
  },
  subordinates: [],
};

const mockManager = {
  id: 3,
  employeeCode: 'EMP003',
  name: 'テスト課長',
  email: 'manager@example.com',
  role: 'manager' as const,
  isActive: true,
  createdAt: new Date('2025-01-03T00:00:00Z'),
  updatedAt: new Date('2025-01-10T00:00:00Z'),
  manager: null,
  subordinates: [
    { id: 1, name: 'テスト太郎' },
    { id: 2, name: 'テスト花子' },
  ],
};

const mockAdmin = {
  id: 4,
  employeeCode: 'EMP004',
  name: 'テスト管理者',
  email: 'admin@example.com',
  role: 'admin' as const,
  isActive: true,
  createdAt: new Date('2025-01-04T00:00:00Z'),
  updatedAt: new Date('2025-01-10T00:00:00Z'),
  manager: null,
  subordinates: [],
};

const mockInactiveMember = {
  id: 5,
  employeeCode: 'EMP005',
  name: '退職済太郎',
  email: 'inactive@example.com',
  role: 'member' as const,
  isActive: false,
  createdAt: new Date('2025-01-05T00:00:00Z'),
  updatedAt: new Date('2025-01-10T00:00:00Z'),
  manager: {
    id: 3,
    name: 'テスト課長',
  },
  subordinates: [],
};

/**
 * テスト用のリクエストを作成
 */
function createRequest(id: string, token?: string): NextRequest {
  const url = new URL(`http://localhost:3000/api/v1/sales-persons/${id}`);

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

/**
 * テスト用のコンテキストを作成
 */
function createContext(id: string): { params: Promise<{ id: string }> } {
  return {
    params: Promise.resolve({ id }),
  };
}

describe('GET /api/v1/sales-persons/{id}', () => {
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

  describe('認証エラー', () => {
    it('トークンなしの場合は401を返す', async () => {
      const request = createRequest('1');
      const context = createContext('1');
      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('認証が必要です');
    });

    it('無効なトークンの場合は401を返す', async () => {
      const request = createRequest('1', 'invalid-token');
      const context = createContext('1');
      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('バリデーションエラー', () => {
    it('IDが数値でない場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);
      const request = createRequest('abc', token);
      const context = createContext('abc');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('IDは正の整数で指定してください');
    });

    it('IDが0の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);
      const request = createRequest('0', token);
      const context = createContext('0');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('IDが負の数の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);
      const request = createRequest('-1', token);
      const context = createContext('-1');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('正常系', () => {
    it('営業担当者詳細を取得できる（上長あり）', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockMember as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);
      const request = createRequest('1', token);
      const context = createContext('1');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        id: mockMember.id,
        employee_code: mockMember.employeeCode,
        name: mockMember.name,
        email: mockMember.email,
        role: mockMember.role,
        is_active: mockMember.isActive,
        manager: {
          id: mockMember.manager.id,
          name: mockMember.manager.name,
        },
        subordinates: [],
      });
      expect(data.data.created_at).toBe(mockMember.createdAt.toISOString());
      expect(data.data.updated_at).toBe(mockMember.updatedAt.toISOString());
    });

    it('営業担当者詳細を取得できる（上長なし、部下あり）', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockManager as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);
      const request = createRequest('3', token);
      const context = createContext('3');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        id: mockManager.id,
        employee_code: mockManager.employeeCode,
        name: mockManager.name,
        email: mockManager.email,
        role: mockManager.role,
        is_active: mockManager.isActive,
        manager: null,
        subordinates: [
          { id: 1, name: 'テスト太郎' },
          { id: 2, name: 'テスト花子' },
        ],
      });
    });

    it('管理者の詳細を取得できる', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockAdmin as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);
      const request = createRequest('4', token);
      const context = createContext('4');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.role).toBe('admin');
      expect(data.data.manager).toBeNull();
      expect(data.data.subordinates).toEqual([]);
    });

    it('無効化された営業担当者の詳細も取得できる', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockInactiveMember as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      };
      const token = await generateToken(payload);
      const request = createRequest('5', token);
      const context = createContext('5');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.is_active).toBe(false);
    });
  });

  describe('NOT_FOUNDエラー', () => {
    it('存在しないIDの場合は404を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(null);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);
      const request = createRequest('9999', token);
      const context = createContext('9999');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toBe('営業担当者が見つかりません');
    });
  });

  describe('エラーハンドリング', () => {
    it('データベースエラーの場合は500を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockRejectedValueOnce(new Error('Database connection error'));

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);
      const request = createRequest('1', token);
      const context = createContext('1');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('営業担当者の取得に失敗しました');
    });
  });

  describe('Prismaクエリの検証', () => {
    it('正しいselectオプションでクエリが実行される', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockMember as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);
      const request = createRequest('1', token);
      const context = createContext('1');

      await GET(request, context);

      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          employeeCode: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          manager: {
            select: {
              id: true,
              name: true,
            },
          },
          subordinates: {
            select: {
              id: true,
              name: true,
            },
            where: {
              isActive: true,
            },
            orderBy: {
              name: 'asc',
            },
          },
        },
      });
    });
  });
});
