/**
 * GET /api/v1/customers APIのテスト
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
      count: vi.fn(),
      findMany: vi.fn(),
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
 * テスト用のリクエストを作成
 */
function createRequest(token?: string, params?: Record<string, string | undefined>): NextRequest {
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
