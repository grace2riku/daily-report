/**
 * コメントAPI
 *
 * GET /api/v1/reports/[id]/comments - コメント一覧取得
 * POST /api/v1/reports/[id]/comments - コメント投稿
 */

import { NextRequest, NextResponse } from 'next/server';

import { successResponse, errorResponse } from '@/lib/api/response';
import { withAuth, canViewReport, type AuthUser } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { idParamSchema } from '@/lib/validations/common';

/**
 * GET /api/v1/reports/[id]/comments
 * 日報に紐づくコメント一覧を取得する
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

    // 日報の存在チェック
    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      select: { id: true, salesPersonId: true },
    });

    if (!report) {
      return errorResponse('NOT_FOUND', '日報が見つかりません');
    }

    // 権限チェック（日報の閲覧権限があるかどうか）
    const hasAccess = await canViewReport(user, report.salesPersonId);
    if (!hasAccess) {
      return errorResponse('FORBIDDEN', 'この日報を閲覧する権限がありません');
    }

    // コメント一覧を取得（作成日時昇順）
    const comments = await prisma.comment.findMany({
      where: { dailyReportId: reportId },
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

    // レスポンスデータを構築
    const responseData = comments.map((comment) => ({
      id: comment.id,
      commenter: {
        id: comment.commenter.id,
        name: comment.commenter.name,
      },
      content: comment.content,
      created_at: comment.createdAt.toISOString(),
      updated_at: comment.updatedAt.toISOString(),
    }));

    return successResponse(responseData);
  });
}

/**
 * POST /api/v1/reports/[id]/comments
 * コメントを投稿する（上長・管理者のみ）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (_req, user: AuthUser): Promise<NextResponse> => {
    // 上長・管理者のみコメント投稿可能
    if (user.role !== 'manager' && user.role !== 'admin') {
      return errorResponse('FORBIDDEN', 'コメントを投稿する権限がありません');
    }

    const { id } = await params;
    const reportId = parseInt(id, 10);

    if (isNaN(reportId)) {
      return errorResponse('BAD_REQUEST', '無効な日報IDです');
    }

    // リクエストボディを取得
    let body: { content?: string };
    try {
      body = await request.json();
    } catch {
      return errorResponse('BAD_REQUEST', 'リクエストボディが不正です');
    }

    // バリデーション
    if (!body.content || body.content.trim() === '') {
      return errorResponse('VALIDATION_ERROR', 'コメント内容を入力してください');
    }

    if (body.content.length > 1000) {
      return errorResponse('VALIDATION_ERROR', 'コメントは1000文字以内で入力してください');
    }

    // 日報の存在確認
    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      select: { id: true, salesPersonId: true },
    });

    if (!report) {
      return errorResponse('NOT_FOUND', '日報が見つかりません');
    }

    // コメントを作成
    const comment = await prisma.comment.create({
      data: {
        dailyReportId: reportId,
        commenterId: user.id,
        content: body.content.trim(),
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

    // レスポンスデータを構築
    const responseData = {
      id: comment.id,
      commenter: {
        id: comment.commenter.id,
        name: comment.commenter.name,
      },
      content: comment.content,
      created_at: comment.createdAt.toISOString(),
      updated_at: comment.updatedAt.toISOString(),
    };

    return successResponse(responseData);
  });
}
