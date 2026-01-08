/**
 * GET/PUT/DELETE /api/v1/customers/{id} APIのテスト
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { generateToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';
import type { JwtPayload } from '@/types';

import { GET, PUT, DELETE } from '../route';

// Prisma モック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
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

const mockManager = {
  id: 3,
  email: 'manager@example.com',
  role: 'manager' as const,
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

/**
 * テスト用のPUTリクエストを作成
 */
function createPutRequest(id: string, body: Record<string, unknown>, token?: string): NextRequest {
  const url = new URL(`http://localhost:3000/api/v1/customers/${id}`);

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return new NextRequest(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
}

describe('PUT /api/v1/customers/{id}', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('認証エラー', () => {
    it('トークンなしの場合は401を返す', async () => {
      const request = createPutRequest('1', { name: '更新名' });
      const context = createContext('1');
      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('認証が必要です');
    });

    it('無効なトークンの場合は401を返す', async () => {
      const request = createPutRequest('1', { name: '更新名' }, 'invalid-token');
      const context = createContext('1');
      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('認可エラー', () => {
    it('一般営業（member）の場合は403を返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: 'member',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { name: '更新名' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toBe('この操作を行う権限がありません');
    });

    it('上長（manager）の場合は403を返す', async () => {
      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: 'manager',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { name: '更新名' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toBe('この操作を行う権限がありません');
    });
  });

  describe('バリデーションエラー - パスパラメータ', () => {
    it('IDが数値でない場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('abc', { name: '更新名' }, token);
      const context = createContext('abc');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('IDは正の整数で指定してください');
    });

    it('IDが0の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('0', { name: '更新名' }, token);
      const context = createContext('0');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('IDが負の数の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('-1', { name: '更新名' }, token);
      const context = createContext('-1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('NOT_FOUNDエラー', () => {
    it('存在しないIDの場合は404を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce(null);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('9999', { name: '更新名' }, token);
      const context = createContext('9999');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toBe('顧客が見つかりません');
    });
  });

  describe('バリデーションエラー - リクエストボディ', () => {
    it('nameが空文字の場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { name: '' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('nameが200文字を超える場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const longName = 'a'.repeat(201);
      const request = createPutRequest('1', { name: longName }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('顧客名は200文字以内で入力してください');
    });

    it('addressが500文字を超える場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const longAddress = 'a'.repeat(501);
      const request = createPutRequest('1', { address: longAddress }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('住所は500文字以内で入力してください');
    });

    it('phoneが無効な形式の場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { phone: 'invalid-phone' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('有効な電話番号を入力してください');
    });

    it('phoneが20文字を超える場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const longPhone = '0'.repeat(21);
      const request = createPutRequest('1', { phone: longPhone }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('電話番号は20文字以内で入力してください');
    });

    it('is_activeがbooleanでない場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { is_active: 'invalid' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('正常系', () => {
    const updatedCustomer = {
      id: 1,
      customerCode: 'C001',
      name: '更新された顧客名',
      address: '東京都新宿区1-1-1',
      phone: '03-9999-8888',
      isActive: true,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-15T00:00:00Z'),
    };

    it('nameのみ更新できる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce({
        ...updatedCustomer,
        name: '新しい顧客名',
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { name: '新しい顧客名' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('新しい顧客名');
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ name: '新しい顧客名' }),
        })
      );
    });

    it('addressを更新できる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce({
        ...updatedCustomer,
        address: '新しい住所',
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { address: '新しい住所' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.address).toBe('新しい住所');
    });

    it('addressを空文字でクリアできる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce({
        ...updatedCustomer,
        address: null,
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { address: '' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.address).toBeNull();
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ address: null }),
        })
      );
    });

    it('phoneを更新できる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce({
        ...updatedCustomer,
        phone: '06-1234-5678',
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { phone: '06-1234-5678' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.phone).toBe('06-1234-5678');
    });

    it('phoneを空文字でクリアできる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce({
        ...updatedCustomer,
        phone: null,
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { phone: '' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.phone).toBeNull();
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ phone: null }),
        })
      );
    });

    it('is_activeをfalseに更新できる（無効化）', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce({
        ...updatedCustomer,
        isActive: false,
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { is_active: false }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.is_active).toBe(false);
    });

    it('is_activeをtrueに更新できる（有効化）', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 2 } as never);
      updateMock.mockResolvedValueOnce({
        ...mockInactiveCustomer,
        isActive: true,
        updatedAt: new Date('2025-01-15T00:00:00Z'),
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('2', { is_active: true }, token);
      const context = createContext('2');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.is_active).toBe(true);
    });

    it('複数項目を同時に更新できる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce({
        id: 1,
        customerCode: 'C001',
        name: '新しい顧客名',
        address: '新しい住所',
        phone: '06-9999-8888',
        isActive: false,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-15T00:00:00Z'),
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest(
        '1',
        {
          name: '新しい顧客名',
          address: '新しい住所',
          phone: '06-9999-8888',
          is_active: false,
        },
        token
      );
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('新しい顧客名');
      expect(data.data.address).toBe('新しい住所');
      expect(data.data.phone).toBe('06-9999-8888');
      expect(data.data.is_active).toBe(false);
    });

    it('レスポンスがsnake_case形式で返される', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce(updatedCustomer as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { name: '更新名' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('customer_code');
      expect(data.data).toHaveProperty('is_active');
      expect(data.data).toHaveProperty('created_at');
      expect(data.data).toHaveProperty('updated_at');
      expect(data.data).not.toHaveProperty('customerCode');
      expect(data.data).not.toHaveProperty('isActive');
      expect(data.data).not.toHaveProperty('createdAt');
      expect(data.data).not.toHaveProperty('updatedAt');
    });

    it('空のリクエストボディでも更新が実行される', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce(mockCustomer as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', {}, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: {},
        })
      );
    });
  });

  describe('エラーハンドリング', () => {
    it('データベースエラー（findUnique）の場合は500を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockRejectedValueOnce(new Error('Database connection error'));

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { name: '更新名' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('顧客の更新に失敗しました');
    });

    it('データベースエラー（update）の場合は500を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockRejectedValueOnce(new Error('Database update error'));

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { name: '更新名' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('顧客の更新に失敗しました');
    });
  });

  describe('Prismaクエリの検証', () => {
    it('正しいパラメータでfindUniqueが呼ばれる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce(mockCustomer as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { name: '更新名' }, token);
      const context = createContext('1');

      await PUT(request, context);

      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true },
      });
    });

    it('正しいパラメータでupdateが呼ばれる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce(mockCustomer as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest(
        '1',
        { name: '更新名', address: '新住所', phone: '03-1111-2222', is_active: false },
        token
      );
      const context = createContext('1');

      await PUT(request, context);

      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: '更新名',
          address: '新住所',
          phone: '03-1111-2222',
          isActive: false,
        },
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
  });
});

/**
 * テスト用のDELETEリクエストを作成
 */
function createDeleteRequest(id: string, token?: string): NextRequest {
  const url = new URL(`http://localhost:3000/api/v1/customers/${id}`);

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return new NextRequest(url, {
    method: 'DELETE',
    headers,
  });
}

describe('DELETE /api/v1/customers/{id}', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('認証エラー', () => {
    it('トークンなしの場合は401を返す', async () => {
      const request = createDeleteRequest('1');
      const context = createContext('1');
      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('認証が必要です');
    });

    it('無効なトークンの場合は401を返す', async () => {
      const request = createDeleteRequest('1', 'invalid-token');
      const context = createContext('1');
      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('認可エラー', () => {
    it('一般営業（member）の場合は403を返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: 'member',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('1', token);
      const context = createContext('1');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toBe('この操作を行う権限がありません');
    });

    it('上長（manager）の場合は403を返す', async () => {
      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: 'manager',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('1', token);
      const context = createContext('1');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toBe('この操作を行う権限がありません');
    });
  });

  describe('バリデーションエラー - パスパラメータ', () => {
    it('IDが数値でない場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('abc', token);
      const context = createContext('abc');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('IDは正の整数で指定してください');
    });

    it('IDが0の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('0', token);
      const context = createContext('0');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('IDが負の数の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('-1', token);
      const context = createContext('-1');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('IDが小数の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('1.5', token);
      const context = createContext('1.5');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('NOT_FOUNDエラー', () => {
    it('存在しないIDの場合は404を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce(null);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('9999', token);
      const context = createContext('9999');

      const response = await DELETE(request, context);
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
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('999999999', token);
      const context = createContext('999999999');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('正常系', () => {
    it('顧客を論理削除できる（管理者）', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce({
        ...mockCustomer,
        isActive: false,
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('1', token);
      const context = createContext('1');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('顧客を削除しました');
    });

    it('削除時にis_activeがfalseに更新される', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce({
        ...mockCustomer,
        isActive: false,
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('1', token);
      const context = createContext('1');

      await DELETE(request, context);

      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
    });

    it('既に無効化されている顧客も削除操作が成功する', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 2 } as never);
      updateMock.mockResolvedValueOnce({
        ...mockInactiveCustomer,
        isActive: false,
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('2', token);
      const context = createContext('2');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('顧客を削除しました');
    });
  });

  describe('エラーハンドリング', () => {
    it('データベースエラー（findUnique）の場合は500を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockRejectedValueOnce(new Error('Database connection error'));

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('1', token);
      const context = createContext('1');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('顧客の削除に失敗しました');
    });

    it('データベースエラー（update）の場合は500を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockRejectedValueOnce(new Error('Database update error'));

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('1', token);
      const context = createContext('1');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('顧客の削除に失敗しました');
    });

    it('予期しないエラーの場合も500を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockRejectedValueOnce(new Error('Unexpected error'));

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('1', token);
      const context = createContext('1');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Prismaクエリの検証', () => {
    it('正しいパラメータでfindUniqueが呼ばれる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce({
        ...mockCustomer,
        isActive: false,
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('1', token);
      const context = createContext('1');

      await DELETE(request, context);

      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true },
      });
    });

    it('IDが文字列で渡されても数値に変換されてクエリが実行される', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const updateMock = vi.mocked(prisma.customer.update);

      findUniqueMock.mockResolvedValueOnce({ id: 123 } as never);
      updateMock.mockResolvedValueOnce({
        ...mockCustomer,
        id: 123,
        isActive: false,
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('123', token);
      const context = createContext('123');

      await DELETE(request, context);

      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id: 123 },
        select: { id: true },
      });
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 123 },
        data: { isActive: false },
      });
    });
  });
});
