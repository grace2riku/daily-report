import { NextRequest, NextResponse } from 'next/server';

import { successResponse, errorResponse } from '@/lib/api/response';
import { withAuth, type AuthUser, canViewReport } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { idParamSchema } from '@/lib/validations/common';

/**
 * GET /api/v1/reports/{id}
 * 日報詳細を取得する
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (_req, user: AuthUser): Promise<NextResponse> => {
    // パスパラメータを取得
    const params = await context.params;
    const idParam = params.id;

    // IDのバリデーション
    const validationResult = idParamSchema.safeParse(idParam);
    if (!validationResult.success) {
      return errorResponse('VALIDATION_ERROR', 'IDは正の整数で指定してください');
    }

    const reportId = validationResult.data;

    // 日報を取得
    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
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

    // 日報が存在しない場合
    if (!report) {
      return errorResponse('NOT_FOUND', '日報が見つかりません');
    }

    // 権限チェック
    const hasAccess = await canViewReport(user, report.salesPersonId);
    if (!hasAccess) {
      return errorResponse('FORBIDDEN', 'この日報を閲覧する権限がありません');
    }

    // レスポンスデータを構築
    const responseData = {
      id: report.id,
      report_date: report.reportDate.toISOString().split('T')[0],
      sales_person: {
        id: report.salesPerson.id,
        name: report.salesPerson.name,
      },
      problem: report.problem,
      plan: report.plan,
      status: report.status,
      visit_records: report.visitRecords.map((record) => ({
        id: record.id,
        customer: {
          id: record.customer.id,
          name: record.customer.name,
        },
        visit_time: record.visitTime,
        content: record.content,
        sort_order: record.sortOrder,
      })),
      comments: report.comments.map((comment) => ({
        id: comment.id,
        commenter: {
          id: comment.commenter.id,
          name: comment.commenter.name,
        },
        content: comment.content,
        created_at: comment.createdAt.toISOString(),
      })),
      created_at: report.createdAt.toISOString(),
      updated_at: report.updatedAt.toISOString(),
    };

    return successResponse(responseData);
  });
}
