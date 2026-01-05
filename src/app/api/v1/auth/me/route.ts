import { NextRequest } from 'next/server';

import { successResponse } from '@/lib/api/response';
import { withAuth, type AuthenticatedUser } from '@/lib/auth/middleware';
import prisma from '@/lib/prisma';

/**
 * GET /api/v1/auth/me
 * 現在のログインユーザー情報を取得する
 */
export const GET = withAuth(async (_request: NextRequest, user: AuthenticatedUser) => {
  // 上長情報を取得
  let manager: { id: number; name: string } | null = null;

  if (user.managerId) {
    const managerData = await prisma.salesPerson.findUnique({
      where: { id: user.managerId },
      select: {
        id: true,
        name: true,
      },
    });

    if (managerData) {
      manager = {
        id: managerData.id,
        name: managerData.name,
      };
    }
  }

  // レスポンスデータを構築
  const responseData = {
    id: user.id,
    employee_code: user.employeeCode,
    name: user.name,
    email: user.email,
    role: user.role,
    manager,
  };

  return successResponse(responseData);
});
