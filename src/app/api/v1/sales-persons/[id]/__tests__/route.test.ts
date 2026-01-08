/**
 * GET/PUT/DELETE /api/v1/sales-persons/{id} APIのテスト
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { generateToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/utils/password';
import type { JwtPayload } from '@/types';

import { GET, PUT, DELETE } from '../route';

// hashPasswordモック
vi.mock('@/lib/utils/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password'),
}));

// Prisma モック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    salesPerson: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
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

/**
 * テスト用のPUTリクエストを作成
 */
function createPutRequest(id: string, body: Record<string, unknown>, token?: string): NextRequest {
  const url = new URL(`http://localhost:3000/api/v1/sales-persons/${id}`);

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

describe('PUT /api/v1/sales-persons/{id}', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    // モックの呼び出し履歴と実装をリセット
    vi.resetAllMocks();
    // hashPasswordのデフォルト実装を再設定
    vi.mocked(hashPassword).mockResolvedValue('hashed_password');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('認証・認可エラー', () => {
    it('トークンなしの場合は401を返す', async () => {
      const request = createPutRequest('1', { name: '更新名' });
      const context = createContext('1');
      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
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
    });
  });

  describe('バリデーションエラー', () => {
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

    it('nameが空文字の場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
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

    it('emailが無効な形式の場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { email: 'invalid-email' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('passwordが7文字以下の場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { password: '1234567' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('roleが無効な値の場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { role: 'invalid' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('NOT_FOUNDエラー', () => {
    it('存在しないIDの場合は404を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
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
      expect(data.error.message).toBe('営業担当者が見つかりません');
    });
  });

  describe('重複エラー', () => {
    it('メールアドレスが他のユーザーと重複する場合は409を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const findFirstMock = vi.mocked(prisma.salesPerson.findFirst);

      // 対象の営業担当者が存在する
      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      // メールアドレスが他のユーザーで使用されている
      findFirstMock.mockResolvedValueOnce({ id: 2 } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { email: 'duplicate@example.com' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DUPLICATE_EMAIL');
      expect(data.error.message).toBe('このメールアドレスは既に使用されています');
    });
  });

  describe('上長設定エラー', () => {
    it('自分自身を上長に設定した場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { manager_id: 1 }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('自分自身を上長に設定することはできません');
    });

    it('存在しない上長を指定した場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      // 対象の営業担当者が存在する
      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      // 指定された上長が存在しない
      findUniqueMock.mockResolvedValueOnce(null);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { manager_id: 9999 }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('指定された上長が存在しません');
    });
  });

  describe('正常系', () => {
    const updatedMember = {
      id: 1,
      employeeCode: 'EMP001',
      name: '更新された名前',
      email: 'updated@example.com',
      role: 'manager' as const,
      isActive: true,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-15T00:00:00Z'),
      manager: {
        id: 3,
        name: 'テスト課長',
      },
    };

    it('名前のみ更新できる', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const updateMock = vi.mocked(prisma.salesPerson.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce({
        ...updatedMember,
        name: '新しい名前',
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { name: '新しい名前' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('新しい名前');
      // 名前のみが更新データに含まれることを確認
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ name: '新しい名前' }),
        })
      );
    });

    it('メールアドレスを更新できる（重複なし）', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const findFirstMock = vi.mocked(prisma.salesPerson.findFirst);
      const updateMock = vi.mocked(prisma.salesPerson.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      findFirstMock.mockResolvedValueOnce(null); // 重複なし
      updateMock.mockResolvedValueOnce({
        ...updatedMember,
        email: 'newemail@example.com',
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { email: 'newemail@example.com' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.email).toBe('newemail@example.com');
      expect(findFirstMock).toHaveBeenCalledWith({
        where: {
          email: 'newemail@example.com',
          id: { not: 1 },
        },
        select: { id: true },
      });
    });

    it('パスワードを更新できる', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const updateMock = vi.mocked(prisma.salesPerson.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce(updatedMember as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { password: 'newpassword123' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(hashPassword).toHaveBeenCalledWith('newpassword123');
      // パスワードハッシュが更新データに含まれることを確認
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ passwordHash: 'hashed_password' }),
        })
      );
    });

    it('パスワードが空文字の場合は更新しない', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const updateMock = vi.mocked(prisma.salesPerson.update);

      // 存在確認用のモック
      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce({
        ...updatedMember,
        name: '名前',
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { name: '名前', password: '' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(hashPassword).not.toHaveBeenCalled();
      // パスワードが空文字の場合、passwordHashは更新データに含まれない
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ passwordHash: expect.anything() }),
        })
      );
    });

    it('roleを更新できる', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const updateMock = vi.mocked(prisma.salesPerson.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce({
        id: 1,
        employeeCode: 'EMP001',
        name: '更新された名前',
        email: 'updated@example.com',
        role: 'admin' as const,
        isActive: true,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-15T00:00:00Z'),
        manager: {
          id: 3,
          name: 'テスト課長',
        },
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { role: 'admin' }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.role).toBe('admin');
    });

    it('上長を設定できる', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const updateMock = vi.mocked(prisma.salesPerson.update);

      // 対象の営業担当者が存在する
      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      // 指定された上長が存在する
      findUniqueMock.mockResolvedValueOnce({ id: 3 } as never);
      updateMock.mockResolvedValueOnce(updatedMember as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { manager_id: 3 }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.manager.id).toBe(3);
    });

    it('上長をnullにできる（上長解除）', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const updateMock = vi.mocked(prisma.salesPerson.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce({
        id: 1,
        employeeCode: 'EMP001',
        name: '更新された名前',
        email: 'updated@example.com',
        role: 'manager' as const,
        isActive: true,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-15T00:00:00Z'),
        manager: null,
      } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createPutRequest('1', { manager_id: null }, token);
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.manager).toBeNull();
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ managerId: null }),
        })
      );
    });

    it('is_activeを更新できる（無効化）', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const updateMock = vi.mocked(prisma.salesPerson.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce({
        id: 1,
        employeeCode: 'EMP001',
        name: '更新された名前',
        email: 'updated@example.com',
        role: 'manager' as const,
        isActive: false,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-15T00:00:00Z'),
        manager: {
          id: 3,
          name: 'テスト課長',
        },
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

    it('複数項目を同時に更新できる', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const findFirstMock = vi.mocked(prisma.salesPerson.findFirst);
      const updateMock = vi.mocked(prisma.salesPerson.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      findFirstMock.mockResolvedValueOnce(null); // メール重複なし
      findUniqueMock.mockResolvedValueOnce({ id: 3 } as never); // 上長存在
      updateMock.mockResolvedValueOnce({
        id: 1,
        employeeCode: 'EMP001',
        name: '新しい名前',
        email: 'newemail@example.com',
        role: 'manager',
        isActive: true,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-15T00:00:00Z'),
        manager: {
          id: 3,
          name: 'テスト課長',
        },
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
          name: '新しい名前',
          email: 'newemail@example.com',
          role: 'manager',
          manager_id: 3,
        },
        token
      );
      const context = createContext('1');

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('新しい名前');
      expect(data.data.email).toBe('newemail@example.com');
      expect(data.data.role).toBe('manager');
      expect(data.data.manager.id).toBe(3);
    });

    it('レスポンスがsnake_case形式で返される', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const updateMock = vi.mocked(prisma.salesPerson.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1 } as never);
      updateMock.mockResolvedValueOnce(updatedMember as never);

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
      expect(data.data).toHaveProperty('employee_code');
      expect(data.data).toHaveProperty('is_active');
      expect(data.data).toHaveProperty('created_at');
      expect(data.data).toHaveProperty('updated_at');
      expect(data.data).not.toHaveProperty('employeeCode');
      expect(data.data).not.toHaveProperty('isActive');
      expect(data.data).not.toHaveProperty('createdAt');
      expect(data.data).not.toHaveProperty('updatedAt');
    });
  });

  describe('エラーハンドリング', () => {
    it('データベースエラーの場合は500を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
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
      expect(data.error.message).toBe('営業担当者の更新に失敗しました');
    });
  });
});

/**
 * テスト用のDELETEリクエストを作成
 */
function createDeleteRequest(id: string, token?: string): NextRequest {
  const url = new URL(`http://localhost:3000/api/v1/sales-persons/${id}`);

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

describe('DELETE /api/v1/sales-persons/{id}', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    vi.resetAllMocks();
    vi.mocked(hashPassword).mockResolvedValue('hashed_password');
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

  describe('バリデーションエラー', () => {
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
  });

  describe('NOT_FOUNDエラー', () => {
    it('存在しないIDの場合は404を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
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
      expect(data.error.message).toBe('営業担当者が見つかりません');
    });
  });

  describe('正常系', () => {
    it('管理者が営業担当者を削除できる（論理削除）', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const updateMock = vi.mocked(prisma.salesPerson.update);

      // 営業担当者が存在する
      findUniqueMock.mockResolvedValueOnce({ id: 1, isActive: true } as never);
      // 論理削除（update）が成功
      updateMock.mockResolvedValueOnce({ id: 1, isActive: false } as never);

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
      expect(data.data.message).toBe('営業担当者を削除しました');

      // updateがisActive: falseで呼ばれていることを確認
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
    });

    it('既に無効化されている営業担当者も削除できる', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const updateMock = vi.mocked(prisma.salesPerson.update);

      // 既に無効化されている営業担当者が存在する
      findUniqueMock.mockResolvedValueOnce({ id: 5, isActive: false } as never);
      // 論理削除（update）が成功
      updateMock.mockResolvedValueOnce({ id: 5, isActive: false } as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: 'admin',
      };
      const token = await generateToken(payload);
      const request = createDeleteRequest('5', token);
      const context = createContext('5');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('営業担当者を削除しました');
    });
  });

  describe('エラーハンドリング', () => {
    it('データベースエラー（findUnique）の場合は500を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
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
      expect(data.error.message).toBe('営業担当者の削除に失敗しました');
    });

    it('データベースエラー（update）の場合は500を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const updateMock = vi.mocked(prisma.salesPerson.update);

      // 営業担当者が存在する
      findUniqueMock.mockResolvedValueOnce({ id: 1, isActive: true } as never);
      // updateでエラー発生
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
      expect(data.error.message).toBe('営業担当者の削除に失敗しました');
    });
  });

  describe('Prismaクエリの検証', () => {
    it('正しいパラメータでfindUniqueが呼ばれる', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const updateMock = vi.mocked(prisma.salesPerson.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1, isActive: true } as never);
      updateMock.mockResolvedValueOnce({ id: 1, isActive: false } as never);

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
        select: { id: true, isActive: true },
      });
    });

    it('正しいパラメータでupdateが呼ばれる（論理削除）', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      const updateMock = vi.mocked(prisma.salesPerson.update);

      findUniqueMock.mockResolvedValueOnce({ id: 1, isActive: true } as never);
      updateMock.mockResolvedValueOnce({ id: 1, isActive: false } as never);

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
  });
});
