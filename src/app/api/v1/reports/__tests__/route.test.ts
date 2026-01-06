/**
 * GET /api/v1/reports APIのテスト
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
    salesPerson: {
      findMany: vi.fn(),
    },
    dailyReport: {
      count: vi.fn(),
      findMany: vi.fn(),
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

const mockMember2 = {
  id: 2,
  employeeCode: 'EMP002',
  name: 'テスト花子',
  email: 'member2@example.com',
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
const mockReports = [
  {
    id: 1,
    reportDate: new Date('2025-01-15'),
    status: 'submitted',
    createdAt: new Date('2025-01-15T18:00:00Z'),
    updatedAt: new Date('2025-01-15T18:30:00Z'),
    salesPerson: { id: 1, name: 'テスト太郎' },
    _count: { visitRecords: 3 },
  },
  {
    id: 2,
    reportDate: new Date('2025-01-14'),
    status: 'reviewed',
    createdAt: new Date('2025-01-14T18:00:00Z'),
    updatedAt: new Date('2025-01-14T19:00:00Z'),
    salesPerson: { id: 1, name: 'テスト太郎' },
    _count: { visitRecords: 2 },
  },
  {
    id: 3,
    reportDate: new Date('2025-01-15'),
    status: 'draft',
    createdAt: new Date('2025-01-15T17:00:00Z'),
    updatedAt: new Date('2025-01-15T17:00:00Z'),
    salesPerson: { id: 2, name: 'テスト花子' },
    _count: { visitRecords: 4 },
  },
  {
    id: 4,
    reportDate: new Date('2025-01-13'),
    status: 'submitted',
    createdAt: new Date('2025-01-13T18:00:00Z'),
    updatedAt: new Date('2025-01-13T18:00:00Z'),
    salesPerson: { id: 3, name: 'テスト課長' },
    _count: { visitRecords: 1 },
  },
];

/**
 * テスト用のリクエストを作成
 */
function createRequest(token?: string, params?: Record<string, string | undefined>): NextRequest {
  const url = new URL('http://localhost:3000/api/v1/reports');

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

describe('GET /api/v1/reports', () => {
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

  describe('IT-010-01: 一覧取得（一般営業）', () => {
    it('自分の日報のみ取得できる', async () => {
      // モック設定
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      // 自分の日報のみ（id: 1, 2）
      const memberReports = mockReports.filter((r) => r.salesPerson.id === mockMember.id);
      countMock.mockResolvedValueOnce(memberReports.length);
      findManyMock.mockResolvedValueOnce(memberReports as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);

      // 全てのデータが自分のものであることを確認
      data.data.forEach((report: { sales_person: { id: number } }) => {
        expect(report.sales_person.id).toBe(mockMember.id);
      });

      // Prismaが正しい条件で呼び出されたことを確認
      expect(countMock).toHaveBeenCalledWith({
        where: { salesPersonId: { in: [mockMember.id] } },
      });
    });

    it('他人の日報は取得できない（sales_person_id指定で空結果）', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      // 他人のIDを指定
      const request = createRequest(token, { sales_person_id: '2' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0);
      expect(data.pagination.total_count).toBe(0);
    });
  });

  describe('IT-010-02: 一覧取得（上長）', () => {
    it('自分と部下の日報を取得できる', async () => {
      // モック設定
      const salesPersonFindManyMock = vi.mocked(prisma.salesPerson.findMany);
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      // 部下のリスト
      salesPersonFindManyMock.mockResolvedValueOnce([
        { id: mockMember.id },
        { id: mockMember2.id },
      ] as never);

      // 自分と部下の日報（id: 1, 2, 3, 4）
      const managerReports = mockReports.filter(
        (r) =>
          r.salesPerson.id === mockManager.id ||
          r.salesPerson.id === mockMember.id ||
          r.salesPerson.id === mockMember2.id
      );
      countMock.mockResolvedValueOnce(managerReports.length);
      findManyMock.mockResolvedValueOnce(managerReports as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(4);

      // 部下のIDリストを取得するクエリが正しく呼ばれたことを確認
      expect(salesPersonFindManyMock).toHaveBeenCalledWith({
        where: { managerId: mockManager.id },
        select: { id: true },
      });

      // 正しい条件でフィルタされていることを確認
      expect(countMock).toHaveBeenCalledWith({
        where: {
          salesPersonId: { in: [mockManager.id, mockMember.id, mockMember2.id] },
        },
      });
    });

    it('部下の日報を個別に取得できる', async () => {
      // モック設定
      const salesPersonFindManyMock = vi.mocked(prisma.salesPerson.findMany);
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      // 部下のリスト
      salesPersonFindManyMock.mockResolvedValueOnce([
        { id: mockMember.id },
        { id: mockMember2.id },
      ] as never);

      // 部下の日報のみ
      const subordinateReports = mockReports.filter((r) => r.salesPerson.id === mockMember.id);
      countMock.mockResolvedValueOnce(subordinateReports.length);
      findManyMock.mockResolvedValueOnce(subordinateReports as never);

      const payload: JwtPayload = {
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      };
      const token = await generateToken(payload);

      // 部下のIDを指定
      const request = createRequest(token, { sales_person_id: String(mockMember.id) });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      data.data.forEach((report: { sales_person: { id: number } }) => {
        expect(report.sales_person.id).toBe(mockMember.id);
      });
    });
  });

  describe('IT-010-03: 一覧取得（管理者）', () => {
    it('全員の日報を取得できる', async () => {
      // モック設定
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      countMock.mockResolvedValueOnce(mockReports.length);
      findManyMock.mockResolvedValueOnce(mockReports as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(4);

      // フィルタなしで呼び出されていることを確認
      expect(countMock).toHaveBeenCalledWith({ where: {} });
    });

    it('特定の営業担当者の日報のみを取得できる', async () => {
      // モック設定
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      const filteredReports = mockReports.filter((r) => r.salesPerson.id === mockMember.id);
      countMock.mockResolvedValueOnce(filteredReports.length);
      findManyMock.mockResolvedValueOnce(filteredReports as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token, { sales_person_id: String(mockMember.id) });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);

      // 正しい条件で呼び出されていることを確認
      expect(countMock).toHaveBeenCalledWith({
        where: { salesPersonId: mockMember.id },
      });
    });
  });

  describe('IT-010-04: 日付フィルタ', () => {
    it('開始日のみ指定した場合、その日以降の日報を取得する', async () => {
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      // 2025-01-14以降の日報
      const filteredReports = mockReports.filter(
        (r) => r.salesPerson.id === mockMember.id && r.reportDate >= new Date('2025-01-14')
      );
      countMock.mockResolvedValueOnce(filteredReports.length);
      findManyMock.mockResolvedValueOnce(filteredReports as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token, { start_date: '2025-01-14' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // countの呼び出し引数を確認
      const countCall = countMock.mock.calls[0][0];
      expect(countCall.where.reportDate).toBeDefined();
      expect(countCall.where.reportDate.gte).toBeInstanceOf(Date);
    });

    it('終了日のみ指定した場合、その日以前の日報を取得する', async () => {
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      const filteredReports = mockReports.filter(
        (r) => r.salesPerson.id === mockMember.id && r.reportDate <= new Date('2025-01-14')
      );
      countMock.mockResolvedValueOnce(filteredReports.length);
      findManyMock.mockResolvedValueOnce(filteredReports as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token, { end_date: '2025-01-14' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // countの呼び出し引数を確認
      const countCall = countMock.mock.calls[0][0];
      expect(countCall.where.reportDate).toBeDefined();
      expect(countCall.where.reportDate.lte).toBeInstanceOf(Date);
    });

    it('開始日と終了日を指定した場合、その範囲の日報を取得する', async () => {
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      const filteredReports = mockReports.filter(
        (r) =>
          r.salesPerson.id === mockMember.id &&
          r.reportDate >= new Date('2025-01-14') &&
          r.reportDate <= new Date('2025-01-15')
      );
      countMock.mockResolvedValueOnce(filteredReports.length);
      findManyMock.mockResolvedValueOnce(filteredReports as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token, {
        start_date: '2025-01-14',
        end_date: '2025-01-15',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // countの呼び出し引数を確認
      const countCall = countMock.mock.calls[0][0];
      expect(countCall.where.reportDate.gte).toBeInstanceOf(Date);
      expect(countCall.where.reportDate.lte).toBeInstanceOf(Date);
    });

    it('開始日が終了日より後の場合はバリデーションエラーを返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token, {
        start_date: '2025-01-15',
        end_date: '2025-01-14',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('開始日は終了日以前');
    });
  });

  describe('IT-010-05: ステータスフィルタ', () => {
    it('submittedステータスの日報のみ取得できる', async () => {
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      const filteredReports = mockReports.filter(
        (r) => r.salesPerson.id === mockMember.id && r.status === 'submitted'
      );
      countMock.mockResolvedValueOnce(filteredReports.length);
      findManyMock.mockResolvedValueOnce(filteredReports as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token, { status: 'submitted' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // countの呼び出し引数を確認
      const countCall = countMock.mock.calls[0][0];
      expect(countCall.where.status).toBe('submitted');
    });

    it('draftステータスの日報のみ取得できる', async () => {
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      const filteredReports = mockReports.filter(
        (r) => r.salesPerson.id === mockMember.id && r.status === 'draft'
      );
      countMock.mockResolvedValueOnce(filteredReports.length);
      findManyMock.mockResolvedValueOnce(filteredReports as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token, { status: 'draft' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const countCall = countMock.mock.calls[0][0];
      expect(countCall.where.status).toBe('draft');
    });

    it('reviewedステータスの日報のみ取得できる', async () => {
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      const filteredReports = mockReports.filter(
        (r) => r.salesPerson.id === mockMember.id && r.status === 'reviewed'
      );
      countMock.mockResolvedValueOnce(filteredReports.length);
      findManyMock.mockResolvedValueOnce(filteredReports as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token, { status: 'reviewed' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const countCall = countMock.mock.calls[0][0];
      expect(countCall.where.status).toBe('reviewed');
    });

    it('無効なステータスの場合はバリデーションエラーを返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token, { status: 'invalid_status' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('IT-010-06: ページネーション', () => {
    it('デフォルトのページネーション（page=1, per_page=20）で取得する', async () => {
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      const memberReports = mockReports.filter((r) => r.salesPerson.id === mockMember.id);
      countMock.mockResolvedValueOnce(memberReports.length);
      findManyMock.mockResolvedValueOnce(memberReports as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pagination).toEqual({
        current_page: 1,
        per_page: 20,
        total_pages: 1,
        total_count: 2,
      });

      // findManyの呼び出し引数を確認
      const findManyCall = findManyMock.mock.calls[0][0];
      expect(findManyCall.skip).toBe(0);
      expect(findManyCall.take).toBe(20);
    });

    it('page=2, per_page=10で2ページ目を取得する', async () => {
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      // 総件数25件を想定
      countMock.mockResolvedValueOnce(25);
      findManyMock.mockResolvedValueOnce(mockReports.slice(0, 2) as never);

      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token, { page: '2', per_page: '10' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pagination).toEqual({
        current_page: 2,
        per_page: 10,
        total_pages: 3,
        total_count: 25,
      });

      // findManyの呼び出し引数を確認
      const findManyCall = findManyMock.mock.calls[0][0];
      expect(findManyCall.skip).toBe(10); // (2-1) * 10 = 10
      expect(findManyCall.take).toBe(10);
    });

    it('per_page=100を超える値はバリデーションエラーを返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token, { per_page: '101' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('100以下');
    });

    it('page=0はバリデーションエラーを返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token, { page: '0' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('per_page=0はバリデーションエラーを返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
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

  describe('レスポンスフォーマット', () => {
    it('レスポンスデータが正しいフォーマットで返される', async () => {
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      const memberReports = mockReports.filter((r) => r.salesPerson.id === mockMember.id);
      countMock.mockResolvedValueOnce(memberReports.length);
      findManyMock.mockResolvedValueOnce(memberReports as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // 最初のデータのフォーマットを確認
      const firstReport = data.data[0];
      expect(firstReport).toHaveProperty('id');
      expect(firstReport).toHaveProperty('report_date');
      expect(firstReport).toHaveProperty('sales_person');
      expect(firstReport.sales_person).toHaveProperty('id');
      expect(firstReport.sales_person).toHaveProperty('name');
      expect(firstReport).toHaveProperty('visit_count');
      expect(firstReport).toHaveProperty('status');
      expect(firstReport).toHaveProperty('created_at');
      expect(firstReport).toHaveProperty('updated_at');

      // 日付フォーマットの確認（YYYY-MM-DD）
      expect(firstReport.report_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // ISO8601形式の確認
      expect(firstReport.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(firstReport.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('日報が0件の場合、空配列とページネーション情報を返す', async () => {
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      countMock.mockResolvedValueOnce(0);
      findManyMock.mockResolvedValueOnce([]);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(data.pagination).toEqual({
        current_page: 1,
        per_page: 20,
        total_pages: 0,
        total_count: 0,
      });
    });
  });

  describe('バリデーションエラー', () => {
    it('不正な日付フォーマット（start_date）の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token, { start_date: 'invalid-date' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('YYYY-MM-DD');
    });

    it('不正な日付フォーマット（end_date）の場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token, { end_date: '2025/01/15' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('YYYY-MM-DD');
    });

    it('不正なsales_person_idの場合は422を返す', async () => {
      const payload: JwtPayload = {
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token, { sales_person_id: 'abc' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('複合条件', () => {
    it('日付、ステータス、ページネーションを組み合わせて検索できる', async () => {
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      countMock.mockResolvedValueOnce(1);
      findManyMock.mockResolvedValueOnce([mockReports[0]] as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token, {
        start_date: '2025-01-14',
        end_date: '2025-01-15',
        status: 'submitted',
        page: '1',
        per_page: '10',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // countの呼び出し引数を確認
      const countCall = countMock.mock.calls[0][0];
      expect(countCall.where.salesPersonId).toBeDefined();
      expect(countCall.where.reportDate).toBeDefined();
      expect(countCall.where.status).toBe('submitted');

      // findManyの呼び出し引数を確認
      const findManyCall = findManyMock.mock.calls[0][0];
      expect(findManyCall.skip).toBe(0);
      expect(findManyCall.take).toBe(10);
    });
  });

  describe('ソート順', () => {
    it('日報は報告日の降順でソートされる', async () => {
      const countMock = vi.mocked(prisma.dailyReport.count);
      const findManyMock = vi.mocked(prisma.dailyReport.findMany);

      const memberReports = mockReports.filter((r) => r.salesPerson.id === mockMember.id);
      countMock.mockResolvedValueOnce(memberReports.length);
      findManyMock.mockResolvedValueOnce(memberReports as never);

      const payload: JwtPayload = {
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      };
      const token = await generateToken(payload);

      const request = createRequest(token);
      await GET(request);

      // findManyの呼び出し引数を確認
      const findManyCall = findManyMock.mock.calls[0][0];
      expect(findManyCall.orderBy).toEqual([{ reportDate: 'desc' }, { id: 'desc' }]);
    });
  });
});
