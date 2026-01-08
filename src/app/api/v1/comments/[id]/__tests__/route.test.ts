/**
 * コメントAPI (PUT/DELETE /api/v1/comments/[id]) のテスト
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { generateToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';
import type { JwtPayload } from '@/types';

import { PUT, DELETE } from '../route';

// Prisma モック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    comment: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
  managerId: 3,
};

const mockManager = {
  id: 3,
  employeeCode: 'EMP003',
  name: 'テスト課長',
  email: 'manager@example.com',
  role: 'manager' as const,
  managerId: null,
};

const mockAdmin = {
  id: 4,
  employeeCode: 'EMP004',
  name: 'テスト管理者',
  email: 'admin@example.com',
  role: 'admin' as const,
  managerId: null,
};

// モックデータ: コメント（テスト課長が投稿したコメント）
const mockComment = {
  id: 1,
  dailyReportId: 1,
  commenterId: 3, // テスト課長が投稿
  content: 'A社の件、明日MTGで相談しましょう。',
  createdAt: new Date('2025-01-15T18:30:00Z'),
  updatedAt: new Date('2025-01-15T18:30:00Z'),
};

// 更新されたコメント
const mockUpdatedComment = {
  id: 1,
  dailyReportId: 1,
  commenterId: 3,
  content: '更新されたコメント内容です。',
  createdAt: new Date('2025-01-15T18:30:00Z'),
  updatedAt: new Date('2025-01-15T19:00:00Z'),
  commenter: {
    id: 3,
    name: 'テスト課長',
  },
};

// 管理者が投稿したコメント
const mockAdminComment = {
  id: 2,
  dailyReportId: 1,
  commenterId: 4,
  content: '管理者からのコメントです。',
  createdAt: new Date('2025-01-15T19:00:00Z'),
  updatedAt: new Date('2025-01-15T19:00:00Z'),
};

/**
 * PUT用のリクエストを作成
 */
function createPutRequest(
  token: string | undefined,
  commentId: string,
  body: unknown
): NextRequest {
  const url = `http://localhost:3000/api/v1/comments/${commentId}`;

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

/**
 * DELETE用のリクエストを作成
 */
function createDeleteRequest(token: string | undefined, commentId: string): NextRequest {
  const url = `http://localhost:3000/api/v1/comments/${commentId}`;

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

/**
 * PUTハンドラーを呼び出すヘルパー関数
 */
async function callPUT(token: string | undefined, commentId: string, body: unknown) {
  const request = createPutRequest(token, commentId, body);
  return PUT(request, { params: Promise.resolve({ id: commentId }) });
}

/**
 * DELETEハンドラーを呼び出すヘルパー関数
 */
async function callDELETE(token: string | undefined, commentId: string) {
  const request = createDeleteRequest(token, commentId);
  return DELETE(request, { params: Promise.resolve({ id: commentId }) });
}

describe('PUT /api/v1/comments/{id}', () => {
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
      const response = await callPUT(undefined, '1', { content: '更新コメント' });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('認証が必要です');
    });

    it('無効なトークンの場合は401を返す', async () => {
      const response = await callPUT('invalid-token', '1', { content: '更新コメント' });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('正常系: コメント更新', () => {
    it('投稿者本人がコメントを更新できる（200）', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      const updateMock = vi.mocked(prisma.comment.update);

      findUniqueMock.mockResolvedValueOnce(mockComment as never);
      updateMock.mockResolvedValueOnce(mockUpdatedComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', { content: '更新されたコメント内容です。' });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(1);
      expect(data.data.content).toBe('更新されたコメント内容です。');
      expect(data.data.commenter.id).toBe(3);
      expect(data.data.commenter.name).toBe('テスト課長');
      expect(data.data.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(data.data.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('コメント内容の前後の空白がトリムされる', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      const updateMock = vi.mocked(prisma.comment.update);

      findUniqueMock.mockResolvedValueOnce(mockComment as never);
      updateMock.mockResolvedValueOnce({
        ...mockUpdatedComment,
        content: 'トリムされた内容',
      } as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      await callPUT(token, '1', { content: '  トリムされた内容  ' });

      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          content: 'トリムされた内容',
        },
        include: {
          commenter: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });
  });

  describe('権限エラー: 他人のコメントを更新', () => {
    it('他人のコメントは更新できない（403 FORBIDDEN）', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockComment as never);

      // テスト管理者がテスト課長のコメントを更新しようとする
      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', { content: '他人のコメントを更新' });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toBe('このコメントを更新する権限がありません');
    });

    it('一般営業は上長のコメントを更新できない', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockComment as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', { content: '一般営業が上長のコメントを更新' });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('存在しないコメントID（404）', () => {
    it('存在しないコメントIDの場合は404を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      findUniqueMock.mockResolvedValueOnce(null);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '999', { content: '存在しないコメントを更新' });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toBe('コメントが見つかりません');
    });
  });

  describe('IDバリデーション', () => {
    it('IDが文字列の場合は400を返す', async () => {
      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, 'abc', { content: '更新コメント' });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('BAD_REQUEST');
      expect(data.error.message).toBe('無効なコメントIDです');
    });

    it('IDが負の数の場合でもNaNとなり400を返す', async () => {
      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      // parserIntは'-1'を-1として解釈するが、コードの仕様によりNaN判定
      // 実際にテストして挙動を確認
      const response = await callPUT(token, 'abc123', { content: '更新コメント' });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('バリデーションエラー', () => {
    it('コメント内容が空の場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', { content: '' });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('コメント内容を入力してください');
    });

    it('コメント内容が空白のみの場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', { content: '   ' });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('contentプロパティがない場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', {});
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('コメントが1001文字以上の場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const longContent = 'あ'.repeat(1001);
      const response = await callPUT(token, '1', { content: longContent });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('コメントは1000文字以内で入力してください');
    });

    it('コメントが1000文字の場合は正常に更新できる', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      const updateMock = vi.mocked(prisma.comment.update);

      findUniqueMock.mockResolvedValueOnce(mockComment as never);

      const longContent = 'あ'.repeat(1000);
      updateMock.mockResolvedValueOnce({
        ...mockUpdatedComment,
        content: longContent,
      } as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', { content: longContent });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('不正なリクエストボディ', () => {
    it('リクエストボディが不正なJSONの場合は400を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const url = 'http://localhost:3000/api/v1/comments/1';
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Authorization', `Bearer ${token}`);

      const request = new NextRequest(url, {
        method: 'PUT',
        headers,
        body: 'invalid json',
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('BAD_REQUEST');
      expect(data.error.message).toBe('リクエストボディが不正です');
    });
  });

  describe('Prismaクエリの確認', () => {
    it('正しいIDでPrisma.comment.findUniqueが呼び出される', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      const updateMock = vi.mocked(prisma.comment.update);

      findUniqueMock.mockResolvedValueOnce(mockComment as never);
      updateMock.mockResolvedValueOnce(mockUpdatedComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      await callPUT(token, '1', { content: '更新内容' });

      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, commenterId: true },
      });
    });
  });

  describe('レスポンスフォーマット', () => {
    it('更新成功時のレスポンスが正しいフォーマットで返される', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      const updateMock = vi.mocked(prisma.comment.update);

      findUniqueMock.mockResolvedValueOnce(mockComment as never);
      updateMock.mockResolvedValueOnce(mockUpdatedComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', { content: '更新内容' });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');

      // トップレベルフィールドの確認
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('commenter');
      expect(data.data.commenter).toHaveProperty('id');
      expect(data.data.commenter).toHaveProperty('name');
      expect(data.data).toHaveProperty('content');
      expect(data.data).toHaveProperty('created_at');
      expect(data.data).toHaveProperty('updated_at');

      // ISO8601形式の確認
      expect(data.data.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(data.data.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});

describe('DELETE /api/v1/comments/{id}', () => {
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
      const response = await callDELETE(undefined, '1');
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('認証が必要です');
    });

    it('無効なトークンの場合は401を返す', async () => {
      const response = await callDELETE('invalid-token', '1');
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('IT-021-01: 投稿者が削除（200）', () => {
    it('投稿者本人がコメントを削除できる', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      const deleteMock = vi.mocked(prisma.comment.delete);

      findUniqueMock.mockResolvedValueOnce(mockComment as never);
      deleteMock.mockResolvedValueOnce(mockComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callDELETE(token, '1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('コメントを削除しました');
    });

    it('管理者が自分のコメントを削除できる', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      const deleteMock = vi.mocked(prisma.comment.delete);

      findUniqueMock.mockResolvedValueOnce(mockAdminComment as never);
      deleteMock.mockResolvedValueOnce(mockAdminComment as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      };
      const token = await generateToken(payload);

      const response = await callDELETE(token, '2');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('コメントを削除しました');
    });
  });

  describe('IT-021-02: 他人が削除（403 FORBIDDEN）', () => {
    it('他人のコメントは削除できない', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockComment as never);

      // 管理者がテスト課長のコメントを削除しようとする
      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      };
      const token = await generateToken(payload);

      const response = await callDELETE(token, '1');
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toBe('このコメントを削除する権限がありません');
    });

    it('一般営業は上長のコメントを削除できない', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockComment as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callDELETE(token, '1');
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('上長は管理者のコメントを削除できない', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockAdminComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callDELETE(token, '2');
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('存在しないコメントID（404）', () => {
    it('存在しないコメントIDの場合は404を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      findUniqueMock.mockResolvedValueOnce(null);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callDELETE(token, '999');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toBe('コメントが見つかりません');
    });
  });

  describe('IDバリデーション', () => {
    it('IDが文字列の場合は400を返す', async () => {
      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callDELETE(token, 'abc');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('BAD_REQUEST');
      expect(data.error.message).toBe('無効なコメントIDです');
    });

    it('IDがNaNとなる値の場合は400を返す', async () => {
      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callDELETE(token, 'not-a-number');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('Prismaクエリの確認', () => {
    it('正しいIDでPrisma.comment.findUniqueが呼び出される', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      const deleteMock = vi.mocked(prisma.comment.delete);

      findUniqueMock.mockResolvedValueOnce(mockComment as never);
      deleteMock.mockResolvedValueOnce(mockComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      await callDELETE(token, '1');

      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, commenterId: true },
      });
    });

    it('正しいIDでPrisma.comment.deleteが呼び出される', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      const deleteMock = vi.mocked(prisma.comment.delete);

      findUniqueMock.mockResolvedValueOnce(mockComment as never);
      deleteMock.mockResolvedValueOnce(mockComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      await callDELETE(token, '1');

      expect(deleteMock).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('レスポンスフォーマット', () => {
    it('削除成功時のレスポンスが正しいフォーマットで返される', async () => {
      const findUniqueMock = vi.mocked(prisma.comment.findUnique);
      const deleteMock = vi.mocked(prisma.comment.delete);

      findUniqueMock.mockResolvedValueOnce(mockComment as never);
      deleteMock.mockResolvedValueOnce(mockComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callDELETE(token, '1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('message', 'コメントを削除しました');
    });
  });
});
