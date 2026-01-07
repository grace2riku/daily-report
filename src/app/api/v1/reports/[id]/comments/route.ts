/**
 * コメントAPI
 *
 * POST /api/v1/reports/[id]/comments - コメント投稿
 */

import { NextRequest, NextResponse } from 'next/server';

import { successResponse, errorResponse } from '@/lib/api/response';
import { withAuth, type AuthUser } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

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
