import { NextRequest, NextResponse } from 'next/server';

import { successResponse, errorResponse } from '@/lib/api/response';
import { withAuth, type AuthUser } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/v1/auth/me
 * 現在のログインユーザー情報を取得する
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (_req, user: AuthUser): Promise<NextResponse> => {
    // データベースからユーザーの詳細情報を取得
    const salesPerson = await prisma.salesPerson.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        email: true,
        role: true,
        managerId: true,
        isActive: true,
        manager: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!salesPerson) {
      return errorResponse('UNAUTHORIZED', 'ユーザーが見つかりません');
    }

    // アカウントが無効化されている場合
    if (!salesPerson.isActive) {
      return errorResponse('ACCOUNT_DISABLED', 'アカウントが無効化されています');
    }

    // レスポンスデータを構築
    const responseData = {
      id: salesPerson.id,
      employee_code: salesPerson.employeeCode,
      name: salesPerson.name,
      email: salesPerson.email,
      role: salesPerson.role,
      manager: salesPerson.manager
        ? {
            id: salesPerson.manager.id,
            name: salesPerson.manager.name,
          }
        : null,
    };

    return successResponse(responseData);
  });
}
