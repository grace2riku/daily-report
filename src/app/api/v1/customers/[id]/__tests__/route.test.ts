/**
 * GET /api/v1/customers/{id} APIのテスト
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
    customer: {
      findUnique: vi.fn(),
    },
  },
}));

const TEST_SECRET = 'test-secret-key-for-testing-only-32-chars';

// モックデータ: 認証ユーザー
const mockMember = {
  id: 1,
  email: 'member@example.com',
  role: 'member' as const,
};

const mockAdmin = {
  id: 4,
  email: 'admin@example.com',
  role: 'admin' as const,
};

// モックデータ: 顧客
const mockCustomer = {
  id: 1,
  customerCode: 'C001',
  name: '株式会社ABC',
  address: '東京都港区1-2-3',
  phone: '03-1234-5678',
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-10T00:00:00Z'),
};

const mockInactiveCustomer = {
  id: 2,
  customerCode: 'C002',
  name: 'DEF株式会社',
  address: null,
  phone: null,
  isActive: false,
  createdAt: new Date('2025-01-02T00:00:00Z'),
  updatedAt: new Date('2025-01-10T00:00:00Z'),
};

const mockCustomerWithNullFields = {
  id: 3,
  customerCode: 'C003',
  name: 'GHI工業',
  address: null,
  phone: null,
  isActive: true,
  createdAt: new Date('2025-01-03T00:00:00Z'),
  updatedAt: new Date('2025-01-10T00:00:00Z'),
};

/**
 * テスト用のリクエストを作成
 */
function createRequest(id: string, token?: string): NextRequest {
  const url = new URL(`http://localhost:3000/api/v1/customers/${id}`);

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

describe('GET /api/v1/customers/{id}', () => {
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

    it('空のAuthorizationヘッダーの場合は401を返す', async () => {
      const url = new URL('http://localhost:3000/api/v1/customers/1');
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Authorization', '');
      const request = new NextRequest(url, {
        method: 'GET',
        headers,
      });
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

    it('IDが小数の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);
      const request = createRequest('1.5', token);
      const context = createContext('1.5');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('正常系', () => {
    it('顧客詳細を取得できる（全フィールドあり）', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockCustomer as never);

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
        id: mockCustomer.id,
        customer_code: mockCustomer.customerCode,
        name: mockCustomer.name,
        address: mockCustomer.address,
        phone: mockCustomer.phone,
        is_active: mockCustomer.isActive,
      });
      expect(data.data.created_at).toBe(mockCustomer.createdAt.toISOString());
      expect(data.data.updated_at).toBe(mockCustomer.updatedAt.toISOString());
    });

    it('顧客詳細を取得できる（任意フィールドがnull）', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockCustomerWithNullFields as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);
      const request = createRequest('3', token);
      const context = createContext('3');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        id: mockCustomerWithNullFields.id,
        customer_code: mockCustomerWithNullFields.customerCode,
        name: mockCustomerWithNullFields.name,
        address: null,
        phone: null,
        is_active: mockCustomerWithNullFields.isActive,
      });
    });

    it('無効化された顧客の詳細も取得できる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockInactiveCustomer as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      };
      const token = await generateToken(payload);
      const request = createRequest('2', token);
      const context = createContext('2');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.is_active).toBe(false);
    });

    it('レスポンスがsnake_case形式で返される', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockCustomer as never);

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
      expect(data.data).toHaveProperty('customer_code');
      expect(data.data).toHaveProperty('is_active');
      expect(data.data).toHaveProperty('created_at');
      expect(data.data).toHaveProperty('updated_at');
      // camelCaseプロパティが存在しないこと
      expect(data.data).not.toHaveProperty('customerCode');
      expect(data.data).not.toHaveProperty('isActive');
      expect(data.data).not.toHaveProperty('createdAt');
      expect(data.data).not.toHaveProperty('updatedAt');
    });

    it('一般営業（member）でも顧客詳細を取得できる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockCustomer as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: 'member',
      };
      const token = await generateToken(payload);
      const request = createRequest('1', token);
      const context = createContext('1');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('上長（manager）でも顧客詳細を取得できる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockCustomer as never);

      const payload: JwtPayload = {
        userId: 3,
        email: 'manager@example.com',
        role: 'manager',
      };
      const token = await generateToken(payload);
      const request = createRequest('1', token);
      const context = createContext('1');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('管理者（admin）でも顧客詳細を取得できる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockCustomer as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createRequest('1', token);
      const context = createContext('1');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('NOT_FOUNDエラー', () => {
    it('存在しないIDの場合は404を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
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
      expect(data.error.message).toBe('顧客が見つかりません');
    });

    it('大きなIDでも正しく404を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce(null);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);
      const request = createRequest('999999999', token);
      const context = createContext('999999999');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('エラーハンドリング', () => {
    it('データベース接続エラーの場合は500を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
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
      expect(data.error.message).toBe('顧客の取得に失敗しました');
    });

    it('データベースタイムアウトエラーの場合は500を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockRejectedValueOnce(new Error('Query timed out'));

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
    });

    it('予期しないエラーの場合も500を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockRejectedValueOnce(new Error('Unexpected error'));

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      };
      const token = await generateToken(payload);
      const request = createRequest('1', token);
      const context = createContext('1');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('顧客の取得に失敗しました');
    });
  });

  describe('Prismaクエリの検証', () => {
    it('正しいselectオプションでクエリが実行される', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockCustomer as never);

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
          customerCode: true,
          name: true,
          address: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('IDが文字列で渡されても数値に変換されてクエリが実行される', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockCustomer as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);
      const request = createRequest('123', token);
      const context = createContext('123');

      await GET(request, context);

      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id: 123 },
        select: expect.any(Object),
      });
    });
  });
});
