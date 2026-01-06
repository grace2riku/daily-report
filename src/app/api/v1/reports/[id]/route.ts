import { NextRequest, NextResponse } from 'next/server';

import { successResponse, errorResponse } from '@/lib/api/response';
import { withAuth, type AuthUser, canViewReport, canEditReport } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { idParamSchema } from '@/lib/validations/common';
import { updateDailyReportSchema } from '@/lib/validations/daily-report';

/**
 * DELETE /api/v1/reports/{id}
 * 日報を削除する（本人のみ削除可能）
 * 関連する訪問記録・コメントもCASCADE削除される
 */
export async function DELETE(
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

    // 日報の存在チェック
    const existingReport = await prisma.dailyReport.findUnique({
      where: { id: reportId },
    });

    if (!existingReport) {
      return errorResponse('NOT_FOUND', '日報が見つかりません');
    }

    // 本人チェック（本人のみ削除可能）
    if (!canEditReport(user, existingReport.salesPersonId)) {
      return errorResponse('FORBIDDEN', 'この日報を削除する権限がありません');
    }

    // 日報を削除（訪問記録・コメントはCASCADEで自動削除）
    await prisma.dailyReport.delete({
      where: { id: reportId },
    });

    return successResponse({
      message: '日報を削除しました',
    });
  });
}

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

/**
 * 日付文字列をローカルタイムゾーンのDateオブジェクトに変換
 * 日付の始まり（00:00:00）を返す
 */
function parseLocalDateStart(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * リクエストボディをスキーマ用の形式に変換
 * snake_case -> camelCase
 */
interface UpdateReportRequestBody {
  report_date?: string;
  problem?: string;
  plan?: string;
  status?: string;
  visit_records?: Array<{
    id?: number;
    customer_id?: number;
    visit_time?: string;
    content?: string;
  }>;
}

function transformRequestBody(body: UpdateReportRequestBody) {
  return {
    reportDate: body.report_date,
    problem: body.problem,
    plan: body.plan,
    status: body.status,
    visitRecords: body.visit_records?.map((record) => ({
      id: record.id,
      customerId: record.customer_id,
      visitTime: record.visit_time,
      content: record.content,
    })),
  };
}

/**
 * PUT /api/v1/reports/{id}
 * 日報を更新する
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (_req, user: AuthUser): Promise<NextResponse> => {
    // パスパラメータを取得
    const params = await context.params;
    const idParam = params.id;

    // IDのバリデーション
    const idValidationResult = idParamSchema.safeParse(idParam);
    if (!idValidationResult.success) {
      return errorResponse('VALIDATION_ERROR', 'IDは正の整数で指定してください');
    }

    const reportId = idValidationResult.data;

    // 日報の存在チェック
    const existingReport = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: {
        visitRecords: {
          select: { id: true },
        },
      },
    });

    if (!existingReport) {
      return errorResponse('NOT_FOUND', '日報が見つかりません');
    }

    // 本人チェック
    if (!canEditReport(user, existingReport.salesPersonId)) {
      return errorResponse('FORBIDDEN', 'この日報を編集する権限がありません');
    }

    // リクエストボディを取得
    let body: UpdateReportRequestBody;
    try {
      body = await request.json();
    } catch {
      return errorResponse('BAD_REQUEST', 'リクエストボディが不正です');
    }

    // snake_case -> camelCase 変換
    const transformedBody = transformRequestBody(body);

    // バリデーション
    const validationResult = updateDailyReportSchema.safeParse(transformedBody);
    if (!validationResult.success) {
      const issues = validationResult.error.issues;
      const firstError = issues[0];
      return errorResponse('VALIDATION_ERROR', firstError?.message || '入力値が不正です');
    }

    const { reportDate, problem, plan, status, visitRecords } = validationResult.data;

    // 日付変更がある場合、重複チェック
    if (reportDate) {
      const newReportDateObj = parseLocalDateStart(reportDate);
      const existingReportDate = existingReport.reportDate;

      // 日付が変更された場合のみ重複チェック
      if (newReportDateObj.getTime() !== existingReportDate.getTime()) {
        const duplicateReport = await prisma.dailyReport.findUnique({
          where: {
            salesPersonId_reportDate: {
              salesPersonId: user.id,
              reportDate: newReportDateObj,
            },
          },
        });

        if (duplicateReport) {
          return errorResponse('CONFLICT', 'この日付の日報は既に存在します');
        }
      }
    }

    // 訪問記録が指定されている場合、顧客IDの存在確認
    if (visitRecords && visitRecords.length > 0) {
      const customerIds = visitRecords.map((record) => record.customerId);
      const existingCustomers = await prisma.customer.findMany({
        where: {
          id: { in: customerIds },
          isActive: true,
        },
        select: { id: true },
      });
      const existingCustomerIds = new Set(existingCustomers.map((c) => c.id));

      for (const customerId of customerIds) {
        if (!existingCustomerIds.has(customerId)) {
          return errorResponse('VALIDATION_ERROR', `顧客ID ${customerId} は存在しないか無効です`);
        }
      }
    }

    // 既存の訪問記録IDを取得
    const existingVisitRecordIds = new Set(existingReport.visitRecords.map((v) => v.id));

    // トランザクションで日報と訪問記録を更新
    const updatedReport = await prisma.$transaction(async (tx) => {
      // 日報レコードを更新
      const updateData: {
        reportDate?: Date;
        problem?: string | null;
        plan?: string | null;
        status?: 'draft' | 'submitted' | 'reviewed';
      } = {};

      if (reportDate !== undefined) {
        updateData.reportDate = parseLocalDateStart(reportDate);
      }
      if (problem !== undefined) {
        updateData.problem = problem || null;
      }
      if (plan !== undefined) {
        updateData.plan = plan || null;
      }
      if (status !== undefined) {
        updateData.status = status;
      }

      await tx.dailyReport.update({
        where: { id: reportId },
        data: updateData,
      });

      // 訪問記録の処理
      if (visitRecords !== undefined) {
        // リクエストに含まれる既存のIDを収集
        const requestVisitRecordIds = new Set(
          visitRecords.filter((v) => v.id !== undefined).map((v) => v.id as number)
        );

        // リクエストに含まれていない既存レコードを削除
        const idsToDelete = [...existingVisitRecordIds].filter(
          (id) => !requestVisitRecordIds.has(id)
        );
        if (idsToDelete.length > 0) {
          await tx.visitRecord.deleteMany({
            where: {
              id: { in: idsToDelete },
              dailyReportId: reportId,
            },
          });
        }

        // 訪問記録の更新・追加
        for (let index = 0; index < visitRecords.length; index++) {
          const record = visitRecords[index];

          if (record.id !== undefined && existingVisitRecordIds.has(record.id)) {
            // 既存レコードの更新
            await tx.visitRecord.update({
              where: { id: record.id },
              data: {
                customerId: record.customerId,
                visitTime: record.visitTime || null,
                content: record.content,
                sortOrder: index,
              },
            });
          } else {
            // 新規レコードの追加
            await tx.visitRecord.create({
              data: {
                dailyReportId: reportId,
                customerId: record.customerId,
                visitTime: record.visitTime || null,
                content: record.content,
                sortOrder: index,
              },
            });
          }
        }
      }

      // 更新後のデータを取得
      return tx.dailyReport.findUnique({
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
        },
      });
    });

    if (!updatedReport) {
      return errorResponse('INTERNAL_ERROR', '日報の更新に失敗しました');
    }

    // レスポンスデータを構築
    const responseData = {
      id: updatedReport.id,
      report_date: updatedReport.reportDate.toISOString().split('T')[0],
      sales_person: {
        id: updatedReport.salesPerson.id,
        name: updatedReport.salesPerson.name,
      },
      problem: updatedReport.problem,
      plan: updatedReport.plan,
      status: updatedReport.status,
      visit_records: updatedReport.visitRecords.map((record) => ({
        id: record.id,
        customer: {
          id: record.customer.id,
          name: record.customer.name,
        },
        visit_time: record.visitTime,
        content: record.content,
        sort_order: record.sortOrder,
      })),
      created_at: updatedReport.createdAt.toISOString(),
      updated_at: updatedReport.updatedAt.toISOString(),
    };

    return successResponse(responseData);
  });
}
