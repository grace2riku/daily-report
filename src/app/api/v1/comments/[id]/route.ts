/**
 * コメントAPI
 *
 * PUT /api/v1/comments/[id] - コメント更新
 * DELETE /api/v1/comments/[id] - コメント削除
 */

import { NextRequest, NextResponse } from 'next/server';

import { successResponse, errorResponse } from '@/lib/api/response';
import { withAuth, type AuthUser } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/v1/comments/[id]
 * コメントを更新する（投稿者本人のみ）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (_req, user: AuthUser): Promise<NextResponse> => {
    const { id } = await params;
    const commentId = parseInt(id, 10);

    if (isNaN(commentId)) {
      return errorResponse('BAD_REQUEST', '無効なコメントIDです');
    }

    // コメントの存在確認と権限チェック
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, commenterId: true },
    });

    if (!comment) {
      return errorResponse('NOT_FOUND', 'コメントが見つかりません');
    }

    // 投稿者本人のみ更新可能
    if (comment.commenterId !== user.id) {
      return errorResponse('FORBIDDEN', 'このコメントを更新する権限がありません');
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

    // コメントを更新
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
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
      id: updatedComment.id,
      commenter: {
        id: updatedComment.commenter.id,
        name: updatedComment.commenter.name,
      },
      content: updatedComment.content,
      created_at: updatedComment.createdAt.toISOString(),
      updated_at: updatedComment.updatedAt.toISOString(),
    };

    return successResponse(responseData);
  });
}

/**
 * DELETE /api/v1/comments/[id]
 * コメントを削除する（投稿者本人のみ）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (_req, user: AuthUser): Promise<NextResponse> => {
    const { id } = await params;
    const commentId = parseInt(id, 10);

    if (isNaN(commentId)) {
      return errorResponse('BAD_REQUEST', '無効なコメントIDです');
    }

    // コメントの存在確認と権限チェック
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, commenterId: true },
    });

    if (!comment) {
      return errorResponse('NOT_FOUND', 'コメントが見つかりません');
    }

    // 投稿者本人のみ削除可能
    if (comment.commenterId !== user.id) {
      return errorResponse('FORBIDDEN', 'このコメントを削除する権限がありません');
    }

    // コメントを削除
    await prisma.comment.delete({
      where: { id: commentId },
    });

    return successResponse({ message: 'コメントを削除しました' });
  });
}
