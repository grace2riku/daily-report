/**
 * GET/POST /api/v1/sales-persons APIのテスト
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
    salesPerson: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// パスワードハッシュ関数のモック
vi.mock('@/lib/utils/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password_mock'),
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
  manager: {
    id: 3,
    name: 'テスト課長',
  },
};

const mockMember2 = {
  id: 2,
  employeeCode: 'EMP002',
  name: 'テスト花子',
  email: 'member2@example.com',
  role: 'member' as const,
  isActive: true,
  createdAt: new Date('2025-01-02T00:00:00Z'),
  manager: {
    id: 3,
    name: 'テスト課長',
  },
};

const mockManager = {
  id: 3,
  employeeCode: 'EMP003',
  name: 'テスト課長',
  email: 'manager@example.com',
  role: 'manager' as const,
  isActive: true,
  createdAt: new Date('2025-01-03T00:00:00Z'),
  manager: null,
};

const mockAdmin = {
  id: 4,
  employeeCode: 'EMP004',
  name: 'テスト管理者',
  email: 'admin@example.com',
  role: 'admin' as const,
  isActive: true,
  createdAt: new Date('2025-01-04T00:00:00Z'),
  manager: null,
};

const mockInactiveMember = {
  id: 5,
  employeeCode: 'EMP005',
  name: '退職済太郎',
  email: 'inactive@example.com',
  role: 'member' as const,
  isActive: false,
  createdAt: new Date('2025-01-05T00:00:00Z'),
  manager: {
    id: 3,
    name: 'テスト課長',
  },
};

const allSalesPersons = [mockMember, mockMember2, mockManager, mockAdmin, mockInactiveMember];

/**
 * テスト用のリクエストを作成
 */
function createRequest(token?: string, params?: Record<string, string | undefined>): NextRequest {
  const url = new URL('http://localhost:3000/api/v1/sales-persons');

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

describe('GET /api/v1/sales-persons', () => {
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
  });

  describe('一覧取得（フィルタなし）', () => {
    it('全営業担当者一覧を取得できる', async () => {
      // モック設定
      const countMock = vi.mocked(prisma.salesPerson.count);
      const findManyMock = vi.mocked(prisma.salesPerson.findMany);

      countMock.mockResolvedValueOnce(allSalesPersons.length);
      findManyMock.mockResolvedValueOnce(allSalesPersons as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createRequest(token);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(allSalesPersons.length);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.current_page).toBe(1);
      expect(data.pagination.per_page).toBe(20);
      expect(data.pagination.total_count).toBe(allSalesPersons.length);
    });

    it('レスポンス形式が正しい（manager がオブジェクト形式）', async () => {
      const countMock = vi.mocked(prisma.salesPerson.count);
      const findManyMock = vi.mocked(prisma.salesPerson.findMany);

      countMock.mockResolvedValueOnce(1);
      findManyMock.mockResolvedValueOnce([mockMember] as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createRequest(token);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data[0]).toMatchObject({
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
      });
      // created_at がISO形式であることを確認
      expect(data.data[0].created_at).toBe(mockMember.createdAt.toISOString());
    });

    it('上長がいない場合は manager が null', async () => {
      const countMock = vi.mocked(prisma.salesPerson.count);
      const findManyMock = vi.mocked(prisma.salesPerson.findMany);

      countMock.mockResolvedValueOnce(1);
      findManyMock.mockResolvedValueOnce([mockManager] as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createRequest(token);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data[0].manager).toBeNull();
    });
  });

  describe('is_active フィルタ', () => {
    it('is_active=true で有効な営業担当者のみ取得', async () => {
      const countMock = vi.mocked(prisma.salesPerson.count);
      const findManyMock = vi.mocked(prisma.salesPerson.findMany);

      const activePersons = allSalesPersons.filter((p) => p.isActive);
      countMock.mockResolvedValueOnce(activePersons.length);
      findManyMock.mockResolvedValueOnce(activePersons as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { is_active: 'true' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(activePersons.length);

      // count が正しい条件で呼ばれたことを確認
      expect(countMock).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('is_active=false で無効な営業担当者のみ取得', async () => {
      const countMock = vi.mocked(prisma.salesPerson.count);
      const findManyMock = vi.mocked(prisma.salesPerson.findMany);

      const inactivePersons = allSalesPersons.filter((p) => !p.isActive);
      countMock.mockResolvedValueOnce(inactivePersons.length);
      findManyMock.mockResolvedValueOnce(inactivePersons as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { is_active: 'false' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(inactivePersons.length);

      // count が正しい条件で呼ばれたことを確認
      expect(countMock).toHaveBeenCalledWith({
        where: { isActive: false },
      });
    });
  });

  describe('role フィルタ', () => {
    it('role=member でメンバーのみ取得', async () => {
      const countMock = vi.mocked(prisma.salesPerson.count);
      const findManyMock = vi.mocked(prisma.salesPerson.findMany);

      const members = allSalesPersons.filter((p) => p.role === 'member');
      countMock.mockResolvedValueOnce(members.length);
      findManyMock.mockResolvedValueOnce(members as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { role: 'member' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(members.length);

      // count が正しい条件で呼ばれたことを確認
      expect(countMock).toHaveBeenCalledWith({
        where: { role: 'member' },
      });
    });

    it('role=manager で上長のみ取得', async () => {
      const countMock = vi.mocked(prisma.salesPerson.count);
      const findManyMock = vi.mocked(prisma.salesPerson.findMany);

      const managers = allSalesPersons.filter((p) => p.role === 'manager');
      countMock.mockResolvedValueOnce(managers.length);
      findManyMock.mockResolvedValueOnce(managers as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { role: 'manager' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(managers.length);

      // count が正しい条件で呼ばれたことを確認
      expect(countMock).toHaveBeenCalledWith({
        where: { role: 'manager' },
      });
    });

    it('role=admin で管理者のみ取得', async () => {
      const countMock = vi.mocked(prisma.salesPerson.count);
      const findManyMock = vi.mocked(prisma.salesPerson.findMany);

      const admins = allSalesPersons.filter((p) => p.role === 'admin');
      countMock.mockResolvedValueOnce(admins.length);
      findManyMock.mockResolvedValueOnce(admins as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { role: 'admin' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(admins.length);

      // count が正しい条件で呼ばれたことを確認
      expect(countMock).toHaveBeenCalledWith({
        where: { role: 'admin' },
      });
    });

    it('不正な role の場合は422エラー', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { role: 'invalid_role' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('複合フィルタ', () => {
    it('is_active=true かつ role=member でフィルタ', async () => {
      const countMock = vi.mocked(prisma.salesPerson.count);
      const findManyMock = vi.mocked(prisma.salesPerson.findMany);

      const filteredPersons = allSalesPersons.filter((p) => p.isActive && p.role === 'member');
      countMock.mockResolvedValueOnce(filteredPersons.length);
      findManyMock.mockResolvedValueOnce(filteredPersons as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { is_active: 'true', role: 'member' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(filteredPersons.length);

      // count が正しい条件で呼ばれたことを確認
      expect(countMock).toHaveBeenCalledWith({
        where: { isActive: true, role: 'member' },
      });
    });
  });

  describe('ページネーション', () => {
    it('デフォルトのページネーション（page=1, per_page=20）', async () => {
      const countMock = vi.mocked(prisma.salesPerson.count);
      const findManyMock = vi.mocked(prisma.salesPerson.findMany);

      countMock.mockResolvedValueOnce(100);
      findManyMock.mockResolvedValueOnce(allSalesPersons.slice(0, 5) as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
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
      const countMock = vi.mocked(prisma.salesPerson.count);
      const findManyMock = vi.mocked(prisma.salesPerson.findMany);

      countMock.mockResolvedValueOnce(50);
      findManyMock.mockResolvedValueOnce(allSalesPersons.slice(0, 5) as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
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

    it('per_page の最大値（100）を超える場合はエラー', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
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
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { page: '0' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('per_page が0以下の場合はエラー', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createRequest(token, { per_page: '0' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('エラーハンドリング', () => {
    it('データベースエラーの場合は500を返す', async () => {
      const countMock = vi.mocked(prisma.salesPerson.count);
      countMock.mockRejectedValueOnce(new Error('Database connection error'));

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
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
});

/**
 * POST /api/v1/sales-persons のテスト用リクエストを作成
 */
function createPostRequest(token: string | undefined, body: Record<string, unknown>): NextRequest {
  const url = new URL('http://localhost:3000/api/v1/sales-persons');

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('POST /api/v1/sales-persons', () => {
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

  // 有効なリクエストボディ
  const validRequestBody = {
    employee_code: 'EMP100',
    name: '新規太郎',
    email: 'new@example.com',
    password: 'password123',
    role: 'member',
    manager_id: 3,
    is_active: true,
  };

  describe('認証・認可エラー', () => {
    it('トークンなしの場合は401を返す', async () => {
      const request = createPostRequest(undefined, validRequestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('無効なトークンの場合は401を返す', async () => {
      const request = createPostRequest('invalid-token', validRequestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('IT-030-02: 一般営業が登録しようとすると403を返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: 'member',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, validRequestBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('上長が登録しようとすると403を返す', async () => {
      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: 'manager',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, validRequestBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('正常系', () => {
    it('IT-030-01: 管理者が正常に登録できる', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const createMock = vi.mocked(prisma.salesPerson.create);

      // 重複チェック: 社員番号なし、メールなし、上長あり
      findUniqueMock
        .mockResolvedValueOnce(null) // 社員番号重複なし
        .mockResolvedValueOnce(null) // メール重複なし
        .mockResolvedValueOnce({ id: 3 } as never); // 上長存在

      const createdPerson = {
        id: 100,
        employeeCode: 'EMP100',
        name: '新規太郎',
        email: 'new@example.com',
        role: 'member',
        isActive: true,
        createdAt: new Date('2025-01-15T10:00:00Z'),
        manager: {
          id: 3,
          name: 'テスト課長',
        },
      };
      createMock.mockResolvedValueOnce(createdPerson as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, validRequestBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        id: 100,
        employee_code: 'EMP100',
        name: '新規太郎',
        email: 'new@example.com',
        role: 'member',
        is_active: true,
        manager: {
          id: 3,
          name: 'テスト課長',
        },
      });
      expect(data.data.created_at).toBe('2025-01-15T10:00:00.000Z');
    });

    it('上長なしで登録できる', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const createMock = vi.mocked(prisma.salesPerson.create);

      // 重複チェック: 社員番号なし、メールなし
      findUniqueMock
        .mockResolvedValueOnce(null) // 社員番号重複なし
        .mockResolvedValueOnce(null); // メール重複なし

      const createdPerson = {
        id: 101,
        employeeCode: 'EMP101',
        name: '上長なし太郎',
        email: 'nomanager@example.com',
        role: 'admin',
        isActive: true,
        createdAt: new Date('2025-01-15T10:00:00Z'),
        manager: null,
      };
      createMock.mockResolvedValueOnce(createdPerson as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        employee_code: 'EMP101',
        name: '上長なし太郎',
        email: 'nomanager@example.com',
        password: 'password123',
        role: 'admin',
        manager_id: null,
        is_active: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.manager).toBeNull();
    });

    it('デフォルト値が適用される（role=member, is_active=true）', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const createMock = vi.mocked(prisma.salesPerson.create);

      findUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      const createdPerson = {
        id: 102,
        employeeCode: 'EMP102',
        name: 'デフォルト太郎',
        email: 'default@example.com',
        role: 'member',
        isActive: true,
        createdAt: new Date('2025-01-15T10:00:00Z'),
        manager: null,
      };
      createMock.mockResolvedValueOnce(createdPerson as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      // role と is_active を省略
      const request = createPostRequest(token, {
        employee_code: 'EMP102',
        name: 'デフォルト太郎',
        email: 'default@example.com',
        password: 'password123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.role).toBe('member');
      expect(data.data.is_active).toBe(true);
    });
  });

  describe('重複エラー', () => {
    it('IT-030-03: 社員番号が重複している場合は409を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);

      // 社員番号が既に存在
      findUniqueMock.mockResolvedValueOnce({ id: 999 } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, validRequestBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DUPLICATE_EMPLOYEE_CODE');
      expect(data.error.message).toBe('この社員番号は既に使用されています');
    });

    it('IT-030-04: メールアドレスが重複している場合は409を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);

      // 社員番号は重複なし、メールが既に存在
      findUniqueMock
        .mockResolvedValueOnce(null) // 社員番号なし
        .mockResolvedValueOnce({ id: 999 } as never); // メール重複あり

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, validRequestBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DUPLICATE_EMAIL');
      expect(data.error.message).toBe('このメールアドレスは既に使用されています');
    });
  });

  describe('バリデーションエラー', () => {
    it('IT-030-05: パスワードが8文字未満の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        ...validRequestBody,
        password: 'short', // 5文字
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('8文字以上');
    });

    it('社員番号が未入力の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        ...validRequestBody,
        employee_code: '',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('氏名が未入力の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        ...validRequestBody,
        name: '',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('メールアドレスが不正形式の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        ...validRequestBody,
        email: 'invalid-email',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('社員番号に半角英数字以外が含まれる場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        ...validRequestBody,
        employee_code: 'EMP-001', // ハイフンを含む
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('不正なroleの場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        ...validRequestBody,
        role: 'invalid_role',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('指定された上長が存在しない場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);

      // 社員番号なし、メールなし、上長なし
      findUniqueMock
        .mockResolvedValueOnce(null) // 社員番号重複なし
        .mockResolvedValueOnce(null) // メール重複なし
        .mockResolvedValueOnce(null); // 上長が存在しない

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, {
        ...validRequestBody,
        manager_id: 9999, // 存在しない上長ID
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('指定された上長が存在しません');
    });
  });

  describe('エラーハンドリング', () => {
    it('データベースエラーの場合は500を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const createMock = vi.mocked(prisma.salesPerson.create);

      findUniqueMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 3 } as never);

      createMock.mockRejectedValueOnce(new Error('Database connection error'));

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await generateToken(payload);
      const request = createPostRequest(token, validRequestBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('営業担当者の登録に失敗しました');
    });
  });
});
