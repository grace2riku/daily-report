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

import { GET } from '../route';

// Prisma モック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    dailyReport: {
      findUnique: vi.fn(),
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
