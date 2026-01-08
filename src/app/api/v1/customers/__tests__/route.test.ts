/**
 * GET /api/v1/customers, POST /api/v1/customers APIのテスト
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { generateToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';
import type { JwtPayload } from '@/types';

import { GET, POST } from '../route';

// Prisma モック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const TEST_SECRET = 'test-secret-key-for-testing-only-32-chars';

// モックデータ: 顧客
const mockCustomer1 = {
  id: 1,
  customerCode: 'C001',
  name: '株式会社ABC',
  address: '東京都港区1-2-3',
  phone: '03-1234-5678',
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
};

const mockCustomer2 = {
  id: 2,
  customerCode: 'C002',
  name: 'DEF株式会社',
  address: '大阪府大阪市4-5-6',
  phone: '06-9876-5432',
  isActive: true,
  createdAt: new Date('2025-01-02T00:00:00Z'),
};

const mockCustomer3 = {
  id: 3,
  customerCode: 'C003',
  name: 'GHI工業',
  address: null,
  phone: null,
  isActive: true,
  createdAt: new Date('2025-01-03T00:00:00Z'),
};

const mockInactiveCustomer = {
  id: 4,
  customerCode: 'C004',
  name: '解約済み株式会社',
  address: '東京都新宿区7-8-9',
  phone: '03-1111-2222',
  isActive: false,
  createdAt: new Date('2025-01-04T00:00:00Z'),
};

const mockCustomerWithABC = {
  id: 5,
  customerCode: 'ABC123',
  name: 'XYZ商事',
  address: '福岡県福岡市1-1-1',
  phone: '092-333-4444',
  isActive: true,
  createdAt: new Date('2025-01-05T00:00:00Z'),
};

const allCustomers = [
  mockCustomer1,
  mockCustomer2,
  mockCustomer3,
  mockInactiveCustomer,
  mockCustomerWithABC,
];

// テスト用ユーザー情報
const mockUser = {
  id: 1,
  email: 'member@example.com',
  role: 'member' as const,
};

/**
 * テスト用のGETリクエストを作成
 */
function createGetRequest(
  token?: string,
  params?: Record<string, string | undefined>
): NextRequest {
  const url = new URL('http://localhost:3000/api/v1/customers');

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    });
  }

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
 * テスト用のPOSTリクエストを作成
 */
function createPostRequest(token?: string, body?: Record<string, unknown>): NextRequest {
  const url = new URL('http://localhost:3000/api/v1/customers');

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * 後方互換性のためのエイリアス
 */
function createRequest(token?: string, params?: Record<string, string | undefined>): NextRequest {
  return createGetRequest(token, params);
}

describe('GET /api/v1/customers', () => {
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
      const request = createRequest(); // トークンなし
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('認証が必要です');
    });

    it('無効なトークンの場合は401を返す', async () => {
      const request = createRequest('invalid-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('不正な形式のトークンの場合は401を返す', async () => {
      const request = createRequest('Bearer invalid.format.token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('一覧取得（フィルタなし）', () => {
    it('全顧客一覧を取得できる', async () => {
      // モック設定
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      countMock.mockResolvedValueOnce(allCustomers.length);
      findManyMock.mockResolvedValueOnce(allCustomers as never);

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(allCustomers.length);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.current_page).toBe(1);
      expect(data.pagination.per_page).toBe(20);
      expect(data.pagination.total_count).toBe(allCustomers.length);
    });

    it('レスポンス形式がsnake_caseで正しい', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      countMock.mockResolvedValueOnce(1);
      findManyMock.mockResolvedValueOnce([mockCustomer1] as never);

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data[0]).toMatchObject({
        id: mockCustomer1.id,
        customer_code: mockCustomer1.customerCode,
        name: mockCustomer1.name,
        address: mockCustomer1.address,
        phone: mockCustomer1.phone,
        is_active: mockCustomer1.isActive,
      });
      // created_at がISO形式であることを確認
      expect(data.data[0].created_at).toBe(mockCustomer1.createdAt.toISOString());
    });

    it('住所・電話番号がnullの顧客を正しく取得できる', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      countMock.mockResolvedValueOnce(1);
      findManyMock.mockResolvedValueOnce([mockCustomer3] as never);

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data[0].address).toBeNull();
      expect(data.data[0].phone).toBeNull();
    });

    it('データが0件の場合は空配列を返す', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      countMock.mockResolvedValueOnce(0);
      findManyMock.mockResolvedValueOnce([] as never);

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0);
      expect(data.pagination.total_count).toBe(0);
      expect(data.pagination.total_pages).toBe(0);
    });
  });

  describe('is_active フィルタ', () => {
    it('is_active=true で有効な顧客のみ取得', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      const activeCustomers = allCustomers.filter((c) => c.isActive);
      countMock.mockResolvedValueOnce(activeCustomers.length);
      findManyMock.mockResolvedValueOnce(activeCustomers as never);

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { is_active: 'true' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(activeCustomers.length);

      // count が正しい条件で呼ばれたことを確認
      expect(countMock).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('is_active=false で無効な顧客のみ取得', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      const inactiveCustomers = allCustomers.filter((c) => !c.isActive);
      countMock.mockResolvedValueOnce(inactiveCustomers.length);
      findManyMock.mockResolvedValueOnce(inactiveCustomers as never);

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { is_active: 'false' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(inactiveCustomers.length);

      // count が正しい条件で呼ばれたことを確認
      expect(countMock).toHaveBeenCalledWith({
        where: { isActive: false },
      });
    });

    it('is_active を指定しない場合はフィルタなしで全件取得', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      countMock.mockResolvedValueOnce(allCustomers.length);
      findManyMock.mockResolvedValueOnce(allCustomers as never);

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token); // is_active なし

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(allCustomers.length);

      // count が空の条件で呼ばれたことを確認（フィルタなし）
      expect(countMock).toHaveBeenCalledWith({
        where: {},
      });
    });
  });

  describe('keyword 検索', () => {
    it('顧客名でキーワード部分一致検索できる', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      // "ABC" を含む顧客（株式会社ABC と ABC123コードの顧客）
      const matchedCustomers = [mockCustomer1, mockCustomerWithABC];
      countMock.mockResolvedValueOnce(matchedCustomers.length);
      findManyMock.mockResolvedValueOnce(matchedCustomers as never);

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { keyword: 'ABC' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(matchedCustomers.length);

      // OR条件で検索されることを確認
      expect(countMock).toHaveBeenCalledWith({
        where: {
          OR: [{ name: { contains: 'ABC' } }, { customerCode: { contains: 'ABC' } }],
        },
      });
    });

    it('顧客コードでキーワード部分一致検索できる', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      // "C00" を含む顧客コード
      const matchedCustomers = [mockCustomer1, mockCustomer2, mockCustomer3, mockInactiveCustomer];
      countMock.mockResolvedValueOnce(matchedCustomers.length);
      findManyMock.mockResolvedValueOnce(matchedCustomers as never);

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { keyword: 'C00' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(matchedCustomers.length);
    });

    it('キーワードに一致する顧客がない場合は空配列を返す', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      countMock.mockResolvedValueOnce(0);
      findManyMock.mockResolvedValueOnce([] as never);

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { keyword: 'NOTEXIST' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0);
    });

    it('キーワードが空文字の場合はフィルタなし', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      countMock.mockResolvedValueOnce(allCustomers.length);
      findManyMock.mockResolvedValueOnce(allCustomers as never);

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { keyword: '' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(allCustomers.length);
    });
  });

  describe('複合フィルタ', () => {
    it('is_active=true かつ keyword でフィルタ', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      // isActive=true かつ "株式会社" を含む顧客
      const filteredCustomers = [mockCustomer1];
      countMock.mockResolvedValueOnce(filteredCustomers.length);
      findManyMock.mockResolvedValueOnce(filteredCustomers as never);

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { is_active: 'true', keyword: '株式会社ABC' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(filteredCustomers.length);

      // 複合条件で呼ばれたことを確認
      expect(countMock).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { name: { contains: '株式会社ABC' } },
            { customerCode: { contains: '株式会社ABC' } },
          ],
        },
      });
    });
  });

  describe('ページネーション', () => {
    it('デフォルトのページネーション（page=1, per_page=20）', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      countMock.mockResolvedValueOnce(100);
      findManyMock.mockResolvedValueOnce(allCustomers as never);

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.current_page).toBe(1);
      expect(data.pagination.per_page).toBe(20);
      expect(data.pagination.total_count).toBe(100);
      expect(data.pagination.total_pages).toBe(5);

      // findMany が正しいパラメータで呼ばれたことを確認
      expect(findManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      );
    });

    it('page=2, per_page=10 でページネーション', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      countMock.mockResolvedValueOnce(50);
      findManyMock.mockResolvedValueOnce(allCustomers.slice(0, 5) as never);

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { page: '2', per_page: '10' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.current_page).toBe(2);
      expect(data.pagination.per_page).toBe(10);
      expect(data.pagination.total_count).toBe(50);
      expect(data.pagination.total_pages).toBe(5);

      // findMany が正しいパラメータで呼ばれたことを確認（offset = (2-1) * 10 = 10）
      expect(findManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('per_page の最大値（100）で取得できる', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      countMock.mockResolvedValueOnce(200);
      findManyMock.mockResolvedValueOnce(allCustomers as never);

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { per_page: '100' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.per_page).toBe(100);
    });

    it('per_page の最大値（100）を超える場合はエラー', async () => {
      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { per_page: '101' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('100');
    });

    it('page が0以下の場合はエラー', async () => {
      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { page: '0' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('page が負の値の場合はエラー', async () => {
      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { page: '-1' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('per_page が0以下の場合はエラー', async () => {
      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { per_page: '0' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('page が数値以外の場合はエラー', async () => {
      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { page: 'abc' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('バリデーションエラー', () => {
    it('keywordが200文字を超える場合はエラー', async () => {
      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const longKeyword = 'a'.repeat(201);
      const request = createRequest(token, { keyword: longKeyword });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('200文字以内');
    });
  });

  describe('エラーハンドリング', () => {
    it('データベースエラー（count）の場合は500を返す', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      countMock.mockRejectedValueOnce(new Error('Database connection error'));

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('顧客一覧の取得に失敗しました');
    });

    it('データベースエラー（findMany）の場合は500を返す', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      countMock.mockResolvedValueOnce(10);
      findManyMock.mockRejectedValueOnce(new Error('Query timeout'));

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('ソート順', () => {
    it('顧客コードの昇順でソートされる', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      countMock.mockResolvedValueOnce(allCustomers.length);
      findManyMock.mockResolvedValueOnce(allCustomers as never);

      const payload: JwtPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const token = await generateToken(payload);
      const request = createRequest(token);

      await GET(request);

      // findMany が orderBy: { customerCode: 'asc' } で呼ばれたことを確認
      expect(findManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { customerCode: 'asc' },
        })
      );
    });
  });

  describe('認可（権限別のアクセス）', () => {
    it('member ロールでアクセスできる', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      countMock.mockResolvedValueOnce(1);
      findManyMock.mockResolvedValueOnce([mockCustomer1] as never);

      const payload: JwtPayload = {
        userId: 1,
        email: 'member@example.com',
        role: 'member',
      };
      const token = await generateToken(payload);
      const request = createRequest(token);

      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it('manager ロールでアクセスできる', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      countMock.mockResolvedValueOnce(1);
      findManyMock.mockResolvedValueOnce([mockCustomer1] as never);

      const payload: JwtPayload = {
        userId: 2,
        email: 'manager@example.com',
        role: 'manager',
      };
      const token = await generateToken(payload);
      const request = createRequest(token);

      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it('admin ロールでアクセスできる', async () => {
      const countMock = vi.mocked(prisma.customer.count);
      const findManyMock = vi.mocked(prisma.customer.findMany);

      countMock.mockResolvedValueOnce(1);
      findManyMock.mockResolvedValueOnce([mockCustomer1] as never);

      const payload: JwtPayload = {
        userId: 3,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createRequest(token);

      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });
});

describe('POST /api/v1/customers', () => {
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
      const request = createPostRequest(undefined, {
        customer_code: 'C001',
        name: 'テスト顧客',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('認証が必要です');
    });

    it('無効なトークンの場合は401を返す', async () => {
      const request = createPostRequest('invalid-token', {
        customer_code: 'C001',
        name: 'テスト顧客',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('認可エラー', () => {
    it('[IT-040-02] memberロール（一般営業）では403を返す', async () => {
      const payload: JwtPayload = {
        userId: 1,
        email: 'member@example.com',
        role: 'member',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: 'テスト顧客',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toBe('この操作を行う権限がありません');
    });

    it('managerロールでは403を返す', async () => {
      const payload: JwtPayload = {
        userId: 2,
        email: 'manager@example.com',
        role: 'manager',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: 'テスト顧客',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('バリデーションエラー', () => {
    it('customer_codeが未入力の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        name: 'テスト顧客',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      // customer_codeがundefinedの場合、Zodのデフォルトメッセージが返る
      expect(data.error.message).toBeTruthy();
    });

    it('customer_codeが空文字の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: '',
        name: 'テスト顧客',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('customer_codeが21文字以上の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'A'.repeat(21),
        name: 'テスト顧客',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('20文字以内');
    });

    it('customer_codeに半角英数字以外が含まれる場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001-テスト',
        name: 'テスト顧客',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('半角英数字');
    });

    it('nameが未入力の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      // nameがundefinedの場合、Zodのデフォルトメッセージが返る
      expect(data.error.message).toBeTruthy();
    });

    it('nameが空文字の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: '',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('nameが201文字以上の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: 'あ'.repeat(201),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('200文字以内');
    });

    it('addressが501文字以上の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: 'テスト顧客',
        address: 'あ'.repeat(501),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('500文字以内');
    });

    it('phoneが21文字以上の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: 'テスト顧客',
        phone: '0'.repeat(21),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('20文字以内');
    });

    it('phoneが不正な形式の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: 'テスト顧客',
        phone: 'invalid-phone',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('有効な電話番号');
    });
  });

  describe('顧客コード重複エラー', () => {
    it('[IT-040-03] 顧客コードが既に使用されている場合は409を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockResolvedValueOnce({
        id: 1,
        customerCode: 'C001',
        name: '既存顧客',
        address: null,
        phone: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: 'テスト顧客',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DUPLICATE_CUSTOMER_CODE');
      expect(data.error.message).toBe('この顧客コードは既に使用されています');
    });
  });

  describe('正常系', () => {
    it('[IT-040-01] 管理者が全項目を指定して顧客を正常に登録できる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const createMock = vi.mocked(prisma.customer.create);

      findUniqueMock.mockResolvedValueOnce(null);

      const createdAt = new Date('2025-01-15T10:00:00Z');
      createMock.mockResolvedValueOnce({
        id: 1,
        customerCode: 'C001',
        name: 'テスト顧客株式会社',
        address: '東京都港区1-2-3',
        phone: '03-1234-5678',
        isActive: true,
        createdAt,
      } as never);

      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: 'テスト顧客株式会社',
        address: '東京都港区1-2-3',
        phone: '03-1234-5678',
        is_active: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        id: 1,
        customer_code: 'C001',
        name: 'テスト顧客株式会社',
        address: '東京都港区1-2-3',
        phone: '03-1234-5678',
        is_active: true,
      });
      expect(data.data.created_at).toBe(createdAt.toISOString());
    });

    it('任意項目を省略して顧客を登録できる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const createMock = vi.mocked(prisma.customer.create);

      findUniqueMock.mockResolvedValueOnce(null);

      const createdAt = new Date('2025-01-15T10:00:00Z');
      createMock.mockResolvedValueOnce({
        id: 2,
        customerCode: 'C002',
        name: '最小構成顧客',
        address: null,
        phone: null,
        isActive: true,
        createdAt,
      } as never);

      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C002',
        name: '最小構成顧客',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        id: 2,
        customer_code: 'C002',
        name: '最小構成顧客',
        address: null,
        phone: null,
        is_active: true,
      });
    });

    it('is_active=falseで顧客を登録できる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const createMock = vi.mocked(prisma.customer.create);

      findUniqueMock.mockResolvedValueOnce(null);

      const createdAt = new Date('2025-01-15T10:00:00Z');
      createMock.mockResolvedValueOnce({
        id: 3,
        customerCode: 'C003',
        name: '無効顧客',
        address: null,
        phone: null,
        isActive: false,
        createdAt,
      } as never);

      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C003',
        name: '無効顧客',
        is_active: false,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.is_active).toBe(false);
    });

    it('レスポンス形式がsnake_caseで正しい', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const createMock = vi.mocked(prisma.customer.create);

      findUniqueMock.mockResolvedValueOnce(null);

      const createdAt = new Date('2025-01-15T10:00:00Z');
      createMock.mockResolvedValueOnce({
        id: 1,
        customerCode: 'ABC123',
        name: 'テスト',
        address: '住所',
        phone: '03-1234-5678',
        isActive: true,
        createdAt,
      } as never);

      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'ABC123',
        name: 'テスト',
        address: '住所',
        phone: '03-1234-5678',
        is_active: true,
      });

      const response = await POST(request);
      const data = await response.json();

      // snake_caseのキーが正しく存在することを確認
      expect(data.data).toHaveProperty('customer_code');
      expect(data.data).toHaveProperty('is_active');
      expect(data.data).toHaveProperty('created_at');

      // camelCaseのキーが存在しないことを確認
      expect(data.data).not.toHaveProperty('customerCode');
      expect(data.data).not.toHaveProperty('isActive');
      expect(data.data).not.toHaveProperty('createdAt');
    });

    it('Prismaのcreateが正しいパラメータで呼ばれる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const createMock = vi.mocked(prisma.customer.create);

      findUniqueMock.mockResolvedValueOnce(null);

      const createdAt = new Date('2025-01-15T10:00:00Z');
      createMock.mockResolvedValueOnce({
        id: 1,
        customerCode: 'C001',
        name: 'テスト顧客',
        address: '東京都港区',
        phone: '03-1234-5678',
        isActive: true,
        createdAt,
      } as never);

      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: 'テスト顧客',
        address: '東京都港区',
        phone: '03-1234-5678',
        is_active: true,
      });

      await POST(request);

      expect(createMock).toHaveBeenCalledWith({
        data: {
          customerCode: 'C001',
          name: 'テスト顧客',
          address: '東京都港区',
          phone: '03-1234-5678',
          isActive: true,
        },
        select: {
          id: true,
          customerCode: true,
          name: true,
          address: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
      });
    });

    it('有効な電話番号形式を受け入れる（ハイフンあり）', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const createMock = vi.mocked(prisma.customer.create);

      findUniqueMock.mockResolvedValueOnce(null);

      const createdAt = new Date('2025-01-15T10:00:00Z');
      createMock.mockResolvedValueOnce({
        id: 1,
        customerCode: 'C001',
        name: 'テスト',
        address: null,
        phone: '03-1234-5678',
        isActive: true,
        createdAt,
      } as never);

      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: 'テスト',
        phone: '03-1234-5678',
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('有効な電話番号形式を受け入れる（ハイフンなし）', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const createMock = vi.mocked(prisma.customer.create);

      findUniqueMock.mockResolvedValueOnce(null);

      const createdAt = new Date('2025-01-15T10:00:00Z');
      createMock.mockResolvedValueOnce({
        id: 1,
        customerCode: 'C001',
        name: 'テスト',
        address: null,
        phone: '0312345678',
        isActive: true,
        createdAt,
      } as never);

      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: 'テスト',
        phone: '0312345678',
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('有効な電話番号形式を受け入れる（携帯電話）', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const createMock = vi.mocked(prisma.customer.create);

      findUniqueMock.mockResolvedValueOnce(null);

      const createdAt = new Date('2025-01-15T10:00:00Z');
      createMock.mockResolvedValueOnce({
        id: 1,
        customerCode: 'C001',
        name: 'テスト',
        address: null,
        phone: '090-1234-5678',
        isActive: true,
        createdAt,
      } as never);

      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: 'テスト',
        phone: '090-1234-5678',
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('エラーハンドリング', () => {
    it('データベースエラー（findUnique）の場合は500を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      findUniqueMock.mockRejectedValueOnce(new Error('Database connection error'));

      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: 'テスト顧客',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('顧客の登録に失敗しました');
    });

    it('データベースエラー（create）の場合は500を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const createMock = vi.mocked(prisma.customer.create);

      findUniqueMock.mockResolvedValueOnce(null);
      createMock.mockRejectedValueOnce(new Error('Database constraint error'));

      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: 'テスト顧客',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('顧客の登録に失敗しました');
    });
  });

  describe('境界値テスト', () => {
    it('customer_codeが20文字ちょうどの場合は登録できる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const createMock = vi.mocked(prisma.customer.create);

      findUniqueMock.mockResolvedValueOnce(null);

      const createdAt = new Date('2025-01-15T10:00:00Z');
      const customerCode = 'A'.repeat(20);
      createMock.mockResolvedValueOnce({
        id: 1,
        customerCode,
        name: 'テスト',
        address: null,
        phone: null,
        isActive: true,
        createdAt,
      } as never);

      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: customerCode,
        name: 'テスト',
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('nameが200文字ちょうどの場合は登録できる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const createMock = vi.mocked(prisma.customer.create);

      findUniqueMock.mockResolvedValueOnce(null);

      const createdAt = new Date('2025-01-15T10:00:00Z');
      const name = 'あ'.repeat(200);
      createMock.mockResolvedValueOnce({
        id: 1,
        customerCode: 'C001',
        name,
        address: null,
        phone: null,
        isActive: true,
        createdAt,
      } as never);

      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('addressが500文字ちょうどの場合は登録できる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const createMock = vi.mocked(prisma.customer.create);

      findUniqueMock.mockResolvedValueOnce(null);

      const createdAt = new Date('2025-01-15T10:00:00Z');
      const address = 'あ'.repeat(500);
      createMock.mockResolvedValueOnce({
        id: 1,
        customerCode: 'C001',
        name: 'テスト',
        address,
        phone: null,
        isActive: true,
        createdAt,
      } as never);

      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: 'テスト',
        address,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('phoneが有効な電話番号形式の場合は登録できる', async () => {
      const findUniqueMock = vi.mocked(prisma.customer.findUnique);
      const createMock = vi.mocked(prisma.customer.create);

      findUniqueMock.mockResolvedValueOnce(null);

      const createdAt = new Date('2025-01-15T10:00:00Z');
      const phone = '0120-123-456'; // 有効な電話番号形式
      createMock.mockResolvedValueOnce({
        id: 1,
        customerCode: 'C001',
        name: 'テスト',
        address: null,
        phone,
        isActive: true,
        createdAt,
      } as never);

      const payload: JwtPayload = {
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        customer_code: 'C001',
        name: 'テスト',
        phone,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });
});
