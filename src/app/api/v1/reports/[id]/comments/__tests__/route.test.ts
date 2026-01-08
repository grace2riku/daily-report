/**
 * コメントAPI (GET/POST /api/v1/reports/[id]/comments) のテスト
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
    dailyReport: {
      findUnique: vi.fn(),
    },
    comment: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
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

// モックデータ: 日報
const mockReport = {
  id: 1,
  salesPersonId: 1,
};

const mockMember2Report = {
  id: 2,
  salesPersonId: 2,
};

// モックデータ: コメント一覧
const mockComments = [
  {
    id: 1,
    dailyReportId: 1,
    commenterId: 3,
    content: 'A社の件、明日MTGで相談しましょう。',
    createdAt: new Date('2025-01-15T18:30:00Z'),
    updatedAt: new Date('2025-01-15T18:30:00Z'),
    commenter: {
      id: 3,
      name: 'テスト課長',
    },
  },
  {
    id: 2,
    dailyReportId: 1,
    commenterId: 3,
    content: '競合情報はマーケ部にも共有してください。',
    createdAt: new Date('2025-01-15T18:35:00Z'),
    updatedAt: new Date('2025-01-15T18:35:00Z'),
    commenter: {
      id: 3,
      name: 'テスト課長',
    },
  },
];

// 新規作成されるコメント
const mockCreatedComment = {
  id: 3,
  dailyReportId: 1,
  commenterId: 3,
  content: '新しいコメントです。',
  createdAt: new Date('2025-01-15T19:00:00Z'),
  updatedAt: new Date('2025-01-15T19:00:00Z'),
  commenter: {
    id: 3,
    name: 'テスト課長',
  },
};

/**
 * テスト用のGETリクエストを作成
 */
function createGetRequest(token?: string, reportId: string = '1'): NextRequest {
  const url = `http://localhost:3000/api/v1/reports/${reportId}/comments`;

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
function createPostRequest(
  token: string | undefined,
  reportId: string,
  body: unknown
): NextRequest {
  const url = `http://localhost:3000/api/v1/reports/${reportId}/comments`;

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

/**
 * GETハンドラーを呼び出すヘルパー関数
 */
async function callGET(token: string | undefined, reportId: string = '1') {
  const request = createGetRequest(token, reportId);
  return GET(request, { params: Promise.resolve({ id: reportId }) });
}

/**
 * POSTハンドラーを呼び出すヘルパー関数
 */
async function callPOST(token: string | undefined, reportId: string, body: unknown) {
  const request = createPostRequest(token, reportId, body);
  return POST(request, { params: Promise.resolve({ id: reportId }) });
}

describe('GET /api/v1/reports/{id}/comments', () => {
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
      const response = await callGET(undefined);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('認証が必要です');
    });

    it('無効なトークンの場合は401を返す', async () => {
      const response = await callGET('invalid-token');
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('正常系: コメント一覧取得', () => {
    it('自分の日報のコメント一覧を取得できる', async () => {
      const reportFindUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const commentFindManyMock = vi.mocked(prisma.comment.findMany);

      reportFindUniqueMock.mockResolvedValueOnce(mockReport as never);
      commentFindManyMock.mockResolvedValueOnce(mockComments as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callGET(token, '1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].id).toBe(1);
      expect(data.data[0].content).toBe('A社の件、明日MTGで相談しましょう。');
      expect(data.data[0].commenter.id).toBe(3);
      expect(data.data[0].commenter.name).toBe('テスト課長');
      expect(data.data[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(data.data[0].updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('上長は部下の日報のコメント一覧を取得できる', async () => {
      const reportFindUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const commentFindManyMock = vi.mocked(prisma.comment.findMany);
      const salesPersonFindUniqueMock = vi.mocked(prisma.salesPerson.findUnique);

      reportFindUniqueMock.mockResolvedValueOnce(mockReport as never);
      salesPersonFindUniqueMock.mockResolvedValueOnce({ managerId: mockManager.id } as never);
      commentFindManyMock.mockResolvedValueOnce(mockComments as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callGET(token, '1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it('管理者は全員の日報のコメント一覧を取得できる', async () => {
      const reportFindUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const commentFindManyMock = vi.mocked(prisma.comment.findMany);

      reportFindUniqueMock.mockResolvedValueOnce(mockReport as never);
      commentFindManyMock.mockResolvedValueOnce(mockComments as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      };
      const token = await generateToken(payload);

      const response = await callGET(token, '1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it('コメントが0件の場合は空配列を返す', async () => {
      const reportFindUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const commentFindManyMock = vi.mocked(prisma.comment.findMany);

      reportFindUniqueMock.mockResolvedValueOnce(mockReport as never);
      commentFindManyMock.mockResolvedValueOnce([]);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callGET(token, '1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });
  });

  describe('権限エラー', () => {
    it('一般営業は他人の日報のコメントを取得できない', async () => {
      const reportFindUniqueMock = vi.mocked(prisma.dailyReport.findUnique);

      reportFindUniqueMock.mockResolvedValueOnce(mockMember2Report as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callGET(token, '2');
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toBe('この日報を閲覧する権限がありません');
    });
  });

  describe('存在しない日報ID', () => {
    it('存在しない日報IDの場合は404を返す', async () => {
      const reportFindUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      reportFindUniqueMock.mockResolvedValueOnce(null);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callGET(token, '999');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toBe('日報が見つかりません');
    });
  });

  describe('IDバリデーション', () => {
    it('IDが文字列の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callGET(token, 'abc');
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('IDは正の整数で指定してください');
    });

    it('IDが負の数の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callGET(token, '-1');
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('IDが0の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callGET(token, '0');
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Prismaクエリの確認', () => {
    it('正しい条件でPrismaが呼び出される', async () => {
      const reportFindUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const commentFindManyMock = vi.mocked(prisma.comment.findMany);

      reportFindUniqueMock.mockResolvedValueOnce(mockReport as never);
      commentFindManyMock.mockResolvedValueOnce(mockComments as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      await callGET(token, '1');

      expect(reportFindUniqueMock).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, salesPersonId: true },
      });

      expect(commentFindManyMock).toHaveBeenCalledWith({
        where: { dailyReportId: 1 },
        include: {
          commenter: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });
});

describe('POST /api/v1/reports/{id}/comments', () => {
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
      const response = await callPOST(undefined, '1', { content: 'テストコメント' });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('認証が必要です');
    });

    it('無効なトークンの場合は401を返す', async () => {
      const response = await callPOST('invalid-token', '1', { content: 'テストコメント' });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('IT-020-01: 上長がコメント投稿', () => {
    it('上長が部下の日報にコメントを投稿できる（201）', async () => {
      const reportFindUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const commentCreateMock = vi.mocked(prisma.comment.create);

      reportFindUniqueMock.mockResolvedValueOnce(mockReport as never);
      commentCreateMock.mockResolvedValueOnce(mockCreatedComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPOST(token, '1', { content: '新しいコメントです。' });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(3);
      expect(data.data.content).toBe('新しいコメントです。');
      expect(data.data.commenter.id).toBe(3);
      expect(data.data.commenter.name).toBe('テスト課長');
      expect(data.data.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(data.data.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('IT-020-02: 管理者がコメント投稿', () => {
    it('管理者が任意の日報にコメントを投稿できる（201）', async () => {
      const reportFindUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const commentCreateMock = vi.mocked(prisma.comment.create);

      reportFindUniqueMock.mockResolvedValueOnce(mockReport as never);

      const adminComment = {
        ...mockCreatedComment,
        commenterId: 4,
        commenter: {
          id: 4,
          name: 'テスト管理者',
        },
      };
      commentCreateMock.mockResolvedValueOnce(adminComment as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      };
      const token = await generateToken(payload);

      const response = await callPOST(token, '1', { content: '管理者からのコメントです。' });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.commenter.id).toBe(4);
      expect(data.data.commenter.name).toBe('テスト管理者');
    });
  });

  describe('IT-020-03: 一般営業がコメント投稿（403 FORBIDDEN）', () => {
    it('一般営業は他人の日報にコメントを投稿できない', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPOST(token, '2', { content: 'コメント投稿を試みる' });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toBe('コメントを投稿する権限がありません');
    });

    it('一般営業は自分の日報にもコメントを投稿できない', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPOST(token, '1', { content: '自分の日報にコメント' });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('IT-020-04: 内容未入力（422 VALIDATION_ERROR）', () => {
    it('コメント内容が空の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPOST(token, '1', { content: '' });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('コメント内容を入力してください');
    });

    it('コメント内容が空白のみの場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPOST(token, '1', { content: '   ' });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('コメント内容を入力してください');
    });

    it('contentプロパティがない場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPOST(token, '1', {});
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('追加: コメント1000文字制限', () => {
    it('コメントが1000文字以内の場合は正常に投稿できる', async () => {
      const reportFindUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const commentCreateMock = vi.mocked(prisma.comment.create);

      reportFindUniqueMock.mockResolvedValueOnce(mockReport as never);

      const longContent = 'あ'.repeat(1000);
      const longComment = {
        ...mockCreatedComment,
        content: longContent,
      };
      commentCreateMock.mockResolvedValueOnce(longComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPOST(token, '1', { content: longContent });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('コメントが1001文字以上の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const longContent = 'あ'.repeat(1001);
      const response = await callPOST(token, '1', { content: longContent });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('コメントは1000文字以内で入力してください');
    });
  });

  describe('追加: 存在しない日報ID（404）', () => {
    it('存在しない日報IDの場合は404を返す', async () => {
      const reportFindUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      reportFindUniqueMock.mockResolvedValueOnce(null);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPOST(token, '999', { content: 'コメント' });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toBe('日報が見つかりません');
    });
  });

  describe('追加: IDバリデーション', () => {
    it('IDが文字列の場合は400を返す', async () => {
      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPOST(token, 'abc', { content: 'コメント' });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('BAD_REQUEST');
      expect(data.error.message).toBe('無効な日報IDです');
    });
  });

  describe('追加: 不正なリクエストボディ', () => {
    it('リクエストボディが不正なJSONの場合は400を返す', async () => {
      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const url = 'http://localhost:3000/api/v1/reports/1/comments';
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Authorization', `Bearer ${token}`);

      const request = new NextRequest(url, {
        method: 'POST',
        headers,
        body: 'invalid json',
      });

      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('BAD_REQUEST');
      expect(data.error.message).toBe('リクエストボディが不正です');
    });
  });

  describe('Prismaクエリの確認', () => {
    it('正しいデータでPrisma.comment.createが呼び出される', async () => {
      const reportFindUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const commentCreateMock = vi.mocked(prisma.comment.create);

      reportFindUniqueMock.mockResolvedValueOnce(mockReport as never);
      commentCreateMock.mockResolvedValueOnce(mockCreatedComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      await callPOST(token, '1', { content: '  新しいコメントです。  ' });

      expect(commentCreateMock).toHaveBeenCalledWith({
        data: {
          dailyReportId: 1,
          commenterId: mockManager.id,
          content: '新しいコメントです。', // trimされることを確認
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

  describe('レスポンスフォーマット', () => {
    it('投稿成功時のレスポンスが正しいフォーマットで返される', async () => {
      const reportFindUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const commentCreateMock = vi.mocked(prisma.comment.create);

      reportFindUniqueMock.mockResolvedValueOnce(mockReport as never);
      commentCreateMock.mockResolvedValueOnce(mockCreatedComment as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPOST(token, '1', { content: '新しいコメントです。' });
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
