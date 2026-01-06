/**
 * 営業担当者一覧API
 *
 * GET /api/v1/sales-persons - 営業担当者一覧を取得
 */

import { NextRequest, NextResponse } from 'next/server';

import { successResponse, errorResponse } from '@/lib/api/response';
import { withAuth, type AuthUser } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/v1/sales-persons
 *
 * 営業担当者一覧を取得する。
 * 認証が必要。
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (_req, _user: AuthUser): Promise<NextResponse> => {
    try {
      // is_activeなユーザーのみ取得
      const salesPersons = await prisma.salesPerson.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          employeeCode: true,
          name: true,
          email: true,
          role: true,
          managerId: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      // レスポンス形式に変換
      const data = salesPersons.map((person) => ({
        id: person.id,
        employee_code: person.employeeCode,
        name: person.name,
        email: person.email,
        role: person.role,
        manager_id: person.managerId,
      }));

      return successResponse(data);
    } catch (error) {
      console.error('Sales persons fetch error:', error);
      return errorResponse('INTERNAL_ERROR', '営業担当者一覧の取得に失敗しました');
    }
  });
}
