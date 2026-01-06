/**
 * GET /api/v1/reports/{id} APIのテスト
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
    dailyReport: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    salesPerson: {
      findUnique: vi.fn(),
    },
    customer: {
      findMany: vi.fn(),
    },
    visitRecord: {
      deleteMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
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

// モックデータ: 日報詳細
const mockReportDetail = {
  id: 1,
  salesPersonId: 1,
  reportDate: new Date('2025-01-15'),
  problem: 'A社への提案価格について上長に相談したい。',
  plan: 'B社へ見積もり提出\nC社アポイント調整',
  status: 'submitted',
  createdAt: new Date('2025-01-15T18:00:00Z'),
  updatedAt: new Date('2025-01-15T18:30:00Z'),
  salesPerson: {
    id: 1,
    name: 'テスト太郎',
  },
  visitRecords: [
    {
      id: 1,
      customerId: 1,
      visitTime: '10:00',
      content: '新製品の提案を実施。次回見積もり提出予定。',
      sortOrder: 0,
      customer: {
        id: 1,
        name: '株式会社ABC',
      },
    },
    {
      id: 2,
      customerId: 2,
      visitTime: '14:00',
      content: '定期訪問。現状のサービスに満足とのこと。',
      sortOrder: 1,
      customer: {
        id: 2,
        name: 'DEF株式会社',
      },
    },
  ],
  comments: [
    {
      id: 1,
      commenterId: 3,
      content: 'A社の件、明日MTGで相談しましょう。',
      createdAt: new Date('2025-01-15T18:30:00Z'),
      commenter: {
        id: 3,
        name: 'テスト課長',
      },
    },
    {
      id: 2,
      commenterId: 3,
      content: '競合情報はマーケ部にも共有してください。',
      createdAt: new Date('2025-01-15T18:35:00Z'),
      commenter: {
        id: 3,
        name: 'テスト課長',
      },
    },
  ],
};

// テスト花子の日報
const mockMember2Report = {
  id: 2,
  salesPersonId: 2,
  reportDate: new Date('2025-01-15'),
  problem: null,
  plan: null,
  status: 'draft',
  createdAt: new Date('2025-01-15T17:00:00Z'),
  updatedAt: new Date('2025-01-15T17:00:00Z'),
  salesPerson: {
    id: 2,
    name: 'テスト花子',
  },
  visitRecords: [
    {
      id: 3,
      customerId: 3,
      visitTime: '11:00',
      content: '新規開拓訪問',
      sortOrder: 0,
      customer: {
        id: 3,
        name: 'GHI株式会社',
      },
    },
  ],
  comments: [],
};

// テスト課長の日報（部下でない人の日報）
const mockManagerReport = {
  id: 3,
  salesPersonId: 3,
  reportDate: new Date('2025-01-14'),
  problem: '来期の目標設定について検討中',
  plan: '部下との1on1実施',
  status: 'submitted',
  createdAt: new Date('2025-01-14T18:00:00Z'),
  updatedAt: new Date('2025-01-14T18:00:00Z'),
  salesPerson: {
    id: 3,
    name: 'テスト課長',
  },
  visitRecords: [],
  comments: [],
};

/**
 * テスト用のリクエストを作成
 */
function createRequest(token?: string, reportId: string = '1'): NextRequest {
  const url = `http://localhost:3000/api/v1/reports/${reportId}`;

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
 * GETハンドラーを呼び出すヘルパー関数
 */
async function callGET(token: string | undefined, reportId: string = '1') {
  const request = createRequest(token, reportId);
  return GET(request, { params: Promise.resolve({ id: reportId }) });
}

describe('GET /api/v1/reports/{id}', () => {
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

  describe('IT-012-01: 自分の日報取得', () => {
    it('自分の日報を取得できる', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockReportDetail as never);

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
      expect(data.data.id).toBe(1);
      expect(data.data.report_date).toBe('2025-01-15');
      expect(data.data.sales_person.id).toBe(1);
      expect(data.data.sales_person.name).toBe('テスト太郎');
      expect(data.data.problem).toBe('A社への提案価格について上長に相談したい。');
      expect(data.data.plan).toBe('B社へ見積もり提出\nC社アポイント調整');
      expect(data.data.status).toBe('submitted');
      expect(data.data.visit_records).toHaveLength(2);
      expect(data.data.comments).toHaveLength(2);
    });
  });

  describe('IT-012-02: 部下の日報取得（上長）', () => {
    it('上長は部下の日報を取得できる', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const salesPersonFindUniqueMock = vi.mocked(prisma.salesPerson.findUnique);

      findUniqueMock.mockResolvedValueOnce(mockReportDetail as never);

      // 日報作成者の情報を取得（部下判定用）
      salesPersonFindUniqueMock.mockResolvedValueOnce({
        managerId: mockManager.id, // テスト課長が上長
      } as never);

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
      expect(data.data.id).toBe(1);
      expect(data.data.sales_person.id).toBe(1);
    });

    it('上長は自分自身の日報も取得できる', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockManagerReport as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callGET(token, '3');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(3);
      expect(data.data.sales_person.id).toBe(mockManager.id);
    });
  });

  describe('IT-012-03: 他人の日報取得（一般）', () => {
    it('一般営業は他人の日報を取得できない（403 FORBIDDEN）', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockMember2Report as never);

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

    it('上長でない人の部下の日報は取得できない', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const salesPersonFindUniqueMock = vi.mocked(prisma.salesPerson.findUnique);

      // 他の上長の部下の日報
      const otherManagerSubordinateReport = {
        ...mockMember2Report,
        salesPersonId: 5, // 別の上長の部下
      };
      findUniqueMock.mockResolvedValueOnce(otherManagerSubordinateReport as never);

      // この人の上長は別の人（ID: 6）
      salesPersonFindUniqueMock.mockResolvedValueOnce({
        managerId: 6,
      } as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callGET(token, '2');
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('IT-012-04: 存在しないID', () => {
    it('存在しない日報IDの場合は404を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(null);

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

  describe('追加: 管理者は全員の日報を閲覧可能', () => {
    it('管理者は一般営業の日報を取得できる', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockReportDetail as never);

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
      expect(data.data.id).toBe(1);
    });

    it('管理者は上長の日報も取得できる', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockManagerReport as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      };
      const token = await generateToken(payload);

      const response = await callGET(token, '3');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(3);
      expect(data.data.sales_person.id).toBe(mockManager.id);
    });
  });

  describe('追加: IDが不正な形式', () => {
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

    it('IDが小数の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callGET(token, '1.5');
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('レスポンスフォーマット', () => {
    it('レスポンスデータが正しいフォーマットで返される', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockReportDetail as never);

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

      // トップレベルフィールドの確認
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('report_date');
      expect(data.data).toHaveProperty('sales_person');
      expect(data.data).toHaveProperty('problem');
      expect(data.data).toHaveProperty('plan');
      expect(data.data).toHaveProperty('status');
      expect(data.data).toHaveProperty('visit_records');
      expect(data.data).toHaveProperty('comments');
      expect(data.data).toHaveProperty('created_at');
      expect(data.data).toHaveProperty('updated_at');

      // sales_personのフォーマット確認
      expect(data.data.sales_person).toHaveProperty('id');
      expect(data.data.sales_person).toHaveProperty('name');

      // 日付フォーマットの確認（YYYY-MM-DD）
      expect(data.data.report_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // ISO8601形式の確認
      expect(data.data.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(data.data.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('訪問記録のフォーマットが正しい', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockReportDetail as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callGET(token, '1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.visit_records).toHaveLength(2);

      const visitRecord = data.data.visit_records[0];
      expect(visitRecord).toHaveProperty('id');
      expect(visitRecord).toHaveProperty('customer');
      expect(visitRecord.customer).toHaveProperty('id');
      expect(visitRecord.customer).toHaveProperty('name');
      expect(visitRecord).toHaveProperty('visit_time');
      expect(visitRecord).toHaveProperty('content');
      expect(visitRecord).toHaveProperty('sort_order');

      // ソート順が正しいことを確認
      expect(data.data.visit_records[0].sort_order).toBe(0);
      expect(data.data.visit_records[1].sort_order).toBe(1);
    });

    it('コメントのフォーマットが正しい', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockReportDetail as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callGET(token, '1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.comments).toHaveLength(2);

      const comment = data.data.comments[0];
      expect(comment).toHaveProperty('id');
      expect(comment).toHaveProperty('commenter');
      expect(comment.commenter).toHaveProperty('id');
      expect(comment.commenter).toHaveProperty('name');
      expect(comment).toHaveProperty('content');
      expect(comment).toHaveProperty('created_at');

      // ISO8601形式の確認
      expect(comment.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('訪問記録やコメントが0件でも正常に返却される', async () => {
      const emptyReport = {
        ...mockReportDetail,
        visitRecords: [],
        comments: [],
      };

      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(emptyReport as never);

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
      expect(data.data.visit_records).toEqual([]);
      expect(data.data.comments).toEqual([]);
    });

    it('problem/planがnullの場合も正常に返却される', async () => {
      const reportWithNulls = {
        ...mockReportDetail,
        problem: null,
        plan: null,
      };

      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(reportWithNulls as never);

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
      expect(data.data.problem).toBeNull();
      expect(data.data.plan).toBeNull();
    });

    it('visit_timeがnullの場合も正常に返却される', async () => {
      const reportWithNullVisitTime = {
        ...mockReportDetail,
        visitRecords: [
          {
            id: 1,
            customerId: 1,
            visitTime: null,
            content: '訪問内容',
            sortOrder: 0,
            customer: { id: 1, name: '株式会社ABC' },
          },
        ],
      };

      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(reportWithNullVisitTime as never);

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
      expect(data.data.visit_records[0].visit_time).toBeNull();
    });
  });

  describe('Prismaクエリの確認', () => {
    it('正しいinclude条件でPrismaが呼び出される', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockReportDetail as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      await callGET(token, '1');

      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          salesPerson: {
            select: {
              id: true,
              name: true,
            },
          },
          visitRecords: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
          comments: {
            include: {
              commenter: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });
  });
});

/**
 * PUT /api/v1/reports/{id} APIのテスト
 */

// 既存日報（訪問記録付き）
const mockExistingReport = {
  id: 1,
  salesPersonId: 1,
  reportDate: new Date('2025-01-15'),
  problem: 'A社への提案価格について上長に相談したい。',
  plan: 'B社へ見積もり提出',
  status: 'draft',
  createdAt: new Date('2025-01-15T18:00:00Z'),
  updatedAt: new Date('2025-01-15T18:00:00Z'),
  visitRecords: [{ id: 1 }, { id: 2 }],
};

// 他人の日報
const mockOtherPersonReport = {
  id: 2,
  salesPersonId: 2,
  reportDate: new Date('2025-01-15'),
  problem: null,
  plan: null,
  status: 'draft',
  createdAt: new Date('2025-01-15T17:00:00Z'),
  updatedAt: new Date('2025-01-15T17:00:00Z'),
  visitRecords: [{ id: 3 }],
};

// 更新後の日報
const mockUpdatedReport = {
  id: 1,
  salesPersonId: 1,
  reportDate: new Date('2025-01-15'),
  problem: '課題を更新しました。',
  plan: '予定を更新しました。',
  status: 'submitted',
  createdAt: new Date('2025-01-15T18:00:00Z'),
  updatedAt: new Date('2025-01-15T19:00:00Z'),
  salesPerson: {
    id: 1,
    name: 'テスト太郎',
  },
  visitRecords: [
    {
      id: 1,
      customerId: 1,
      visitTime: '10:00',
      content: '訪問内容を更新しました。',
      sortOrder: 0,
      customer: { id: 1, name: '株式会社ABC' },
    },
    {
      id: 4,
      customerId: 3,
      visitTime: '16:30',
      content: '新規訪問先を追加',
      sortOrder: 1,
      customer: { id: 3, name: 'GHI株式会社' },
    },
  ],
};

/**
 * PUT用のリクエストを作成
 */
function createPutRequest(token: string | undefined, reportId: string, body: unknown): NextRequest {
  const url = `http://localhost:3000/api/v1/reports/${reportId}`;

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
 * PUTハンドラーを呼び出すヘルパー関数
 */
async function callPUT(token: string | undefined, reportId: string, body: unknown) {
  const request = createPutRequest(token, reportId, body);
  return PUT(request, { params: Promise.resolve({ id: reportId }) });
}

describe('PUT /api/v1/reports/{id}', () => {
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
      const response = await callPUT(undefined, '1', {
        problem: '更新テスト',
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('認証が必要です');
    });

    it('無効なトークンの場合は401を返す', async () => {
      const response = await callPUT('invalid-token', '1', {
        problem: '更新テスト',
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('IT-013-01: 正常更新', () => {
    it('日報を正常に更新できる（200）', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const customerFindManyMock = vi.mocked(prisma.customer.findMany);
      const transactionMock = vi.mocked(prisma.$transaction);

      // 既存の日報を返す
      findUniqueMock.mockResolvedValueOnce(mockExistingReport as never);

      // 顧客が存在する
      customerFindManyMock.mockResolvedValueOnce([{ id: 1 }, { id: 3 }] as never);

      // トランザクション結果
      transactionMock.mockImplementationOnce(async (callback) => {
        const mockTx = {
          dailyReport: {
            update: vi.fn().mockResolvedValue({}),
            findUnique: vi.fn().mockResolvedValue(mockUpdatedReport),
          },
          visitRecord: {
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx as never);
      });

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', {
        problem: '課題を更新しました。',
        plan: '予定を更新しました。',
        status: 'submitted',
        visit_records: [
          {
            id: 1,
            customer_id: 1,
            visit_time: '10:00',
            content: '訪問内容を更新しました。',
          },
          {
            customer_id: 3,
            visit_time: '16:30',
            content: '新規訪問先を追加',
          },
        ],
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(1);
      expect(data.data.problem).toBe('課題を更新しました。');
      expect(data.data.plan).toBe('予定を更新しました。');
      expect(data.data.status).toBe('submitted');
      expect(data.data.visit_records).toHaveLength(2);
    });
  });

  describe('IT-013-02: 訪問記録追加', () => {
    it('訪問記録を追加できる（200）', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const customerFindManyMock = vi.mocked(prisma.customer.findMany);
      const transactionMock = vi.mocked(prisma.$transaction);

      findUniqueMock.mockResolvedValueOnce(mockExistingReport as never);
      customerFindManyMock.mockResolvedValueOnce([{ id: 1 }, { id: 2 }, { id: 3 }] as never);

      const reportWithAddedVisit = {
        ...mockUpdatedReport,
        visitRecords: [
          ...mockUpdatedReport.visitRecords,
          {
            id: 5,
            customerId: 2,
            visitTime: '18:00',
            content: '追加訪問',
            sortOrder: 2,
            customer: { id: 2, name: 'DEF株式会社' },
          },
        ],
      };

      transactionMock.mockImplementationOnce(async (callback) => {
        const mockTx = {
          dailyReport: {
            update: vi.fn().mockResolvedValue({}),
            findUnique: vi.fn().mockResolvedValue(reportWithAddedVisit),
          },
          visitRecord: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx as never);
      });

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', {
        visit_records: [
          { id: 1, customer_id: 1, visit_time: '10:00', content: '既存訪問1' },
          { id: 2, customer_id: 2, visit_time: '14:00', content: '既存訪問2' },
          { customer_id: 3, visit_time: '18:00', content: '新規追加訪問' },
        ],
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.visit_records).toHaveLength(3);
    });
  });

  describe('IT-013-03: 訪問記録削除', () => {
    it('リクエストに含まれていない訪問記録は削除される（200）', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const customerFindManyMock = vi.mocked(prisma.customer.findMany);
      const transactionMock = vi.mocked(prisma.$transaction);

      // 既存の日報には訪問記録が2件
      findUniqueMock.mockResolvedValueOnce(mockExistingReport as never);
      customerFindManyMock.mockResolvedValueOnce([{ id: 1 }] as never);

      // 更新後は訪問記録が1件（id=2は削除）
      const reportWithDeletedVisit = {
        ...mockUpdatedReport,
        visitRecords: [
          {
            id: 1,
            customerId: 1,
            visitTime: '10:00',
            content: '残った訪問',
            sortOrder: 0,
            customer: { id: 1, name: '株式会社ABC' },
          },
        ],
      };

      transactionMock.mockImplementationOnce(async (callback) => {
        const mockTx = {
          dailyReport: {
            update: vi.fn().mockResolvedValue({}),
            findUnique: vi.fn().mockResolvedValue(reportWithDeletedVisit),
          },
          visitRecord: {
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx as never);
      });

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      // id=2の訪問記録を含めない -> 削除される
      const response = await callPUT(token, '1', {
        visit_records: [{ id: 1, customer_id: 1, visit_time: '10:00', content: '残った訪問' }],
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.visit_records).toHaveLength(1);
      expect(data.data.visit_records[0].id).toBe(1);
    });
  });

  describe('IT-013-04: 他人の日報更新（403 FORBIDDEN）', () => {
    it('他人の日報は更新できない', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockOtherPersonReport as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '2', {
        problem: '他人の日報を更新しようとする',
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toBe('この日報を編集する権限がありません');
    });

    it('上長でも部下の日報は更新できない', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);

      // 部下の日報
      findUniqueMock.mockResolvedValueOnce({
        ...mockExistingReport,
        salesPersonId: mockMember.id,
      } as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', {
        problem: '上長が部下の日報を更新しようとする',
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('管理者でも他人の日報は更新できない', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockExistingReport as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', {
        problem: '管理者が他人の日報を更新しようとする',
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('IT-013-05: ステータス変更（draft -> submitted）', () => {
    it('ステータスをdraftからsubmittedに変更できる（200）', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const transactionMock = vi.mocked(prisma.$transaction);

      findUniqueMock.mockResolvedValueOnce(mockExistingReport as never);

      const reportWithStatusChange = {
        ...mockUpdatedReport,
        status: 'submitted',
      };

      transactionMock.mockImplementationOnce(async (callback) => {
        const mockTx = {
          dailyReport: {
            update: vi.fn().mockResolvedValue({}),
            findUnique: vi.fn().mockResolvedValue(reportWithStatusChange),
          },
          visitRecord: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx as never);
      });

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', {
        status: 'submitted',
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('submitted');
    });
  });

  describe('追加: 存在しない日報（404）', () => {
    it('存在しない日報IDの場合は404を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(null);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '999', {
        problem: '存在しない日報を更新しようとする',
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toBe('日報が見つかりません');
    });
  });

  describe('追加: IDが不正（422）', () => {
    it('IDが文字列の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, 'abc', {
        problem: '更新テスト',
      });
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

      const response = await callPUT(token, '-1', {
        problem: '更新テスト',
      });
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

      const response = await callPUT(token, '0', {
        problem: '更新テスト',
      });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('追加: 訪問記録の更新（idが指定されているもの）', () => {
    it('既存の訪問記録を更新できる', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const customerFindManyMock = vi.mocked(prisma.customer.findMany);
      const transactionMock = vi.mocked(prisma.$transaction);

      findUniqueMock.mockResolvedValueOnce(mockExistingReport as never);
      customerFindManyMock.mockResolvedValueOnce([{ id: 1 }] as never);

      const updatedVisitReport = {
        ...mockUpdatedReport,
        visitRecords: [
          {
            id: 1,
            customerId: 1,
            visitTime: '11:00',
            content: '更新された訪問内容',
            sortOrder: 0,
            customer: { id: 1, name: '株式会社ABC' },
          },
        ],
      };

      transactionMock.mockImplementationOnce(async (callback) => {
        const mockTx = {
          dailyReport: {
            update: vi.fn().mockResolvedValue({}),
            findUnique: vi.fn().mockResolvedValue(updatedVisitReport),
          },
          visitRecord: {
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx as never);
      });

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', {
        visit_records: [
          {
            id: 1,
            customer_id: 1,
            visit_time: '11:00',
            content: '更新された訪問内容',
          },
        ],
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.visit_records).toHaveLength(1);
      expect(data.data.visit_records[0].visit_time).toBe('11:00');
      expect(data.data.visit_records[0].content).toBe('更新された訪問内容');
    });
  });

  describe('バリデーションエラー', () => {
    it('不正な日付フォーマットの場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockExistingReport as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', {
        report_date: '2025/01/15',
      });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('YYYY-MM-DD');
    });

    it('不正な訪問時刻フォーマットの場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockExistingReport as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', {
        visit_records: [{ customer_id: 1, visit_time: '25:00', content: 'テスト訪問' }],
      });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('HH:MM');
    });

    it('訪問内容が空の場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockExistingReport as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', {
        visit_records: [{ customer_id: 1, content: '' }],
      });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('訪問内容');
    });

    it('存在しない顧客IDの場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const customerFindManyMock = vi.mocked(prisma.customer.findMany);

      findUniqueMock.mockResolvedValueOnce(mockExistingReport as never);
      customerFindManyMock.mockResolvedValueOnce([]); // 顧客が存在しない

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', {
        visit_records: [{ customer_id: 999, content: 'テスト訪問' }],
      });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('999');
    });

    it('無効なステータスの場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockExistingReport as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', {
        status: 'invalid_status',
      });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('problem/planが2000文字を超える場合は422を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockExistingReport as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const longText = 'あ'.repeat(2001);
      const response = await callPUT(token, '1', {
        problem: longText,
      });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('2000文字');
    });

    it('リクエストボディが不正なJSONの場合は400を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockExistingReport as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const url = 'http://localhost:3000/api/v1/reports/1';
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
    });
  });

  describe('レスポンスフォーマット', () => {
    it('更新成功時のレスポンスが正しいフォーマットで返される', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const customerFindManyMock = vi.mocked(prisma.customer.findMany);
      const transactionMock = vi.mocked(prisma.$transaction);

      findUniqueMock.mockResolvedValueOnce(mockExistingReport as never);
      customerFindManyMock.mockResolvedValueOnce([{ id: 1 }] as never);

      transactionMock.mockImplementationOnce(async (callback) => {
        const mockTx = {
          dailyReport: {
            update: vi.fn().mockResolvedValue({}),
            findUnique: vi.fn().mockResolvedValue(mockUpdatedReport),
          },
          visitRecord: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx as never);
      });

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', {
        problem: '更新テスト',
        visit_records: [{ id: 1, customer_id: 1, visit_time: '10:00', content: 'テスト訪問' }],
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');

      // トップレベルフィールドの確認
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('report_date');
      expect(data.data).toHaveProperty('sales_person');
      expect(data.data.sales_person).toHaveProperty('id');
      expect(data.data.sales_person).toHaveProperty('name');
      expect(data.data).toHaveProperty('problem');
      expect(data.data).toHaveProperty('plan');
      expect(data.data).toHaveProperty('status');
      expect(data.data).toHaveProperty('visit_records');
      expect(data.data).toHaveProperty('created_at');
      expect(data.data).toHaveProperty('updated_at');

      // 日付フォーマットの確認（YYYY-MM-DD）
      expect(data.data.report_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // ISO8601形式の確認
      expect(data.data.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(data.data.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // 訪問記録のフォーマット確認
      if (data.data.visit_records.length > 0) {
        const visitRecord = data.data.visit_records[0];
        expect(visitRecord).toHaveProperty('id');
        expect(visitRecord).toHaveProperty('customer');
        expect(visitRecord.customer).toHaveProperty('id');
        expect(visitRecord.customer).toHaveProperty('name');
        expect(visitRecord).toHaveProperty('visit_time');
        expect(visitRecord).toHaveProperty('content');
        expect(visitRecord).toHaveProperty('sort_order');
      }
    });
  });

  describe('部分更新', () => {
    it('problemのみを更新できる', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const transactionMock = vi.mocked(prisma.$transaction);

      findUniqueMock.mockResolvedValueOnce(mockExistingReport as never);

      const partiallyUpdatedReport = {
        ...mockUpdatedReport,
        problem: '新しい課題',
        plan: mockExistingReport.plan,
        status: mockExistingReport.status,
      };

      transactionMock.mockImplementationOnce(async (callback) => {
        const mockTx = {
          dailyReport: {
            update: vi.fn().mockResolvedValue({}),
            findUnique: vi.fn().mockResolvedValue(partiallyUpdatedReport),
          },
          visitRecord: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx as never);
      });

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', {
        problem: '新しい課題',
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.problem).toBe('新しい課題');
    });

    it('visit_recordsを指定しない場合、訪問記録は更新されない', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const transactionMock = vi.mocked(prisma.$transaction);

      findUniqueMock.mockResolvedValueOnce(mockExistingReport as never);

      transactionMock.mockImplementationOnce(async (callback) => {
        const mockTx = {
          dailyReport: {
            update: vi.fn().mockResolvedValue({}),
            findUnique: vi.fn().mockResolvedValue(mockUpdatedReport),
          },
          visitRecord: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx as never);
      });

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callPUT(token, '1', {
        status: 'submitted',
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

/**
 * DELETE /api/v1/reports/{id} APIのテスト
 */

// 削除対象の日報（本人の日報）
const mockOwnReport = {
  id: 1,
  salesPersonId: 1,
  reportDate: new Date('2025-01-15'),
  problem: 'A社への提案価格について上長に相談したい。',
  plan: 'B社へ見積もり提出',
  status: 'draft',
  createdAt: new Date('2025-01-15T18:00:00Z'),
  updatedAt: new Date('2025-01-15T18:00:00Z'),
};

// 訪問記録・コメント付きの日報
const mockReportWithRelations = {
  id: 1,
  salesPersonId: 1,
  reportDate: new Date('2025-01-15'),
  problem: 'A社への提案価格について上長に相談したい。',
  plan: 'B社へ見積もり提出',
  status: 'submitted',
  createdAt: new Date('2025-01-15T18:00:00Z'),
  updatedAt: new Date('2025-01-15T18:30:00Z'),
};

// 他人の日報
const mockOtherUserReport = {
  id: 2,
  salesPersonId: 2,
  reportDate: new Date('2025-01-15'),
  problem: null,
  plan: null,
  status: 'draft',
  createdAt: new Date('2025-01-15T17:00:00Z'),
  updatedAt: new Date('2025-01-15T17:00:00Z'),
};

/**
 * DELETE用のリクエストを作成
 */
function createDeleteRequest(token: string | undefined, reportId: string): NextRequest {
  const url = `http://localhost:3000/api/v1/reports/${reportId}`;

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
 * DELETEハンドラーを呼び出すヘルパー関数
 */
async function callDELETE(token: string | undefined, reportId: string) {
  const request = createDeleteRequest(token, reportId);
  return DELETE(request, { params: Promise.resolve({ id: reportId }) });
}

describe('DELETE /api/v1/reports/{id}', () => {
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

  describe('IT-014-01: 正常削除', () => {
    it('本人の日報を削除できる（200）', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const deleteMock = vi.mocked(prisma.dailyReport.delete);

      findUniqueMock.mockResolvedValueOnce(mockOwnReport as never);
      deleteMock.mockResolvedValueOnce(mockOwnReport as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callDELETE(token, '1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('日報を削除しました');
    });

    it('削除時にPrisma.deleteが正しいIDで呼び出される', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const deleteMock = vi.mocked(prisma.dailyReport.delete);

      findUniqueMock.mockResolvedValueOnce(mockOwnReport as never);
      deleteMock.mockResolvedValueOnce(mockOwnReport as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      await callDELETE(token, '1');

      expect(deleteMock).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('IT-014-02: 他人の日報削除（403 FORBIDDEN）', () => {
    it('他人の日報は削除できない', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockOtherUserReport as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callDELETE(token, '2');
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toBe('この日報を削除する権限がありません');
    });

    it('上長でも部下の日報は削除できない', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);

      // 部下の日報
      findUniqueMock.mockResolvedValueOnce({
        ...mockOwnReport,
        salesPersonId: mockMember.id,
      } as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const response = await callDELETE(token, '1');
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('管理者でも他人の日報は削除できない', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockOwnReport as never);

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
    });
  });

  describe('IT-014-03: 存在しないID（404 NOT_FOUND）', () => {
    it('存在しない日報IDの場合は404を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      findUniqueMock.mockResolvedValueOnce(null);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callDELETE(token, '999');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toBe('日報が見つかりません');
    });
  });

  describe('IT-014-04: 関連データ削除（訪問記録・コメントあり）', () => {
    it('訪問記録・コメントがある日報でも正常に削除できる（CASCADEにより自動削除）', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const deleteMock = vi.mocked(prisma.dailyReport.delete);

      // 訪問記録・コメント付きの日報
      findUniqueMock.mockResolvedValueOnce(mockReportWithRelations as never);
      deleteMock.mockResolvedValueOnce(mockReportWithRelations as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callDELETE(token, '1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('日報を削除しました');

      // Prisma.deleteが呼び出されていることを確認
      // （CASCADE削除はPrismaスキーマで設定済みなので、deleteが呼ばれれば関連データも削除される）
      expect(deleteMock).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('追加: IDが不正な形式（422）', () => {
    it('IDが文字列の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callDELETE(token, 'abc');
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

      const response = await callDELETE(token, '-1');
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

      const response = await callDELETE(token, '0');
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

      const response = await callDELETE(token, '1.5');
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('レスポンスフォーマット', () => {
    it('削除成功時のレスポンスが正しいフォーマットで返される', async () => {
      const findUniqueMock = vi.mocked(prisma.dailyReport.findUnique);
      const deleteMock = vi.mocked(prisma.dailyReport.delete);

      findUniqueMock.mockResolvedValueOnce(mockOwnReport as never);
      deleteMock.mockResolvedValueOnce(mockOwnReport as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const response = await callDELETE(token, '1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('message', '日報を削除しました');
    });
  });
});
