import { NextRequest, NextResponse } from 'next/server';

import {
  paginatedResponse,
  errorResponse,
  calculatePagination,
  calculateOffset,
} from '@/lib/api/response';
import { withAuth, type AuthUser } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { dailyReportQuerySchema } from '@/lib/validations/daily-report';

/**
 * 日付文字列をローカルタイムゾーンのDateオブジェクトに変換
 * 日付の始まり（00:00:00）を返す
 */
function parseLocalDateStart(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * 日付文字列をローカルタイムゾーンのDateオブジェクトに変換
 * 日付の終わり（23:59:59.999）を返す
 */
function parseLocalDateEnd(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

/**
 * 権限に基づいて閲覧可能な営業担当者IDのリストを取得
 *
 * - member: 自分のみ
 * - manager: 自分 + 部下
 * - admin: 全員（nullを返す = フィルタなし）
 */
async function getViewableSalesPersonIds(user: AuthUser): Promise<number[] | null> {
  // adminは全員の日報を閲覧可能
  if (user.role === 'admin') {
    return null; // フィルタなし
  }

  // memberは自分の日報のみ
  if (user.role === 'member') {
    return [user.id];
  }

  // managerは自分 + 部下の日報
  const subordinates = await prisma.salesPerson.findMany({
    where: { managerId: user.id },
    select: { id: true },
  });

  const subordinateIds = subordinates.map((s) => s.id);
  return [user.id, ...subordinateIds];
}

/**
 * GET /api/v1/reports
 * 日報一覧を取得する
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (req, user: AuthUser): Promise<NextResponse> => {
    // クエリパラメータを取得
    const searchParams = req.nextUrl.searchParams;
    const queryParams = {
      startDate: searchParams.get('start_date') || undefined,
      endDate: searchParams.get('end_date') || undefined,
      salesPersonId: searchParams.get('sales_person_id') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || undefined,
      perPage: searchParams.get('per_page') || undefined,
    };

    // バリデーション
    const validationResult = dailyReportQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      // Zodのエラーメッセージを取得（errors配列またはissues配列を確認）
      const issues = validationResult.error.issues;
      const firstError = issues[0];
      return errorResponse('VALIDATION_ERROR', firstError?.message || '入力値が不正です');
    }

    const { startDate, endDate, salesPersonId, status, page, perPage } = validationResult.data;

    // 権限に基づいて閲覧可能な営業担当者IDを取得
    const viewableSalesPersonIds = await getViewableSalesPersonIds(user);

    // 検索条件を構築
    const whereCondition: {
      salesPersonId?: number | { in: number[] };
      reportDate?: { gte?: Date; lte?: Date };
      status?: 'draft' | 'submitted' | 'reviewed';
    } = {};

    // 権限に基づくフィルタ
    if (viewableSalesPersonIds !== null) {
      // 特定のsales_person_idが指定された場合、権限チェック
      if (salesPersonId !== undefined) {
        if (!viewableSalesPersonIds.includes(salesPersonId)) {
          // 指定されたIDが閲覧可能範囲外の場合、空の結果を返す
          return paginatedResponse([], calculatePagination(page, perPage, 0));
        }
        whereCondition.salesPersonId = salesPersonId;
      } else {
        whereCondition.salesPersonId = { in: viewableSalesPersonIds };
      }
    } else {
      // adminの場合、sales_person_idが指定されていれば使用
      if (salesPersonId !== undefined) {
        whereCondition.salesPersonId = salesPersonId;
      }
    }

    // 日付フィルタ
    if (startDate || endDate) {
      whereCondition.reportDate = {};
      if (startDate) {
        whereCondition.reportDate.gte = parseLocalDateStart(startDate);
      }
      if (endDate) {
        whereCondition.reportDate.lte = parseLocalDateEnd(endDate);
      }
    }

    // ステータスフィルタ
    if (status) {
      whereCondition.status = status;
    }

    // 総件数を取得
    const totalCount = await prisma.dailyReport.count({
      where: whereCondition,
    });

    // ページネーション計算
    const pagination = calculatePagination(page, perPage, totalCount);
    const offset = calculateOffset(page, perPage);

    // 日報一覧を取得（訪問記録件数含む）
    const reports = await prisma.dailyReport.findMany({
      where: whereCondition,
      select: {
        id: true,
        reportDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        salesPerson: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            visitRecords: true,
          },
        },
      },
      orderBy: [{ reportDate: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: perPage,
    });

    // レスポンスデータを構築
    const responseData = reports.map((report) => ({
      id: report.id,
      report_date: report.reportDate.toISOString().split('T')[0],
      sales_person: {
        id: report.salesPerson.id,
        name: report.salesPerson.name,
      },
      visit_count: report._count.visitRecords,
      status: report.status,
      created_at: report.createdAt.toISOString(),
      updated_at: report.updatedAt.toISOString(),
    }));

    return paginatedResponse(responseData, pagination);
  });
}
