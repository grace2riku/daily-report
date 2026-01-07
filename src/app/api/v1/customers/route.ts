/**
 * 顧客API
 *
 * GET /api/v1/customers - 顧客一覧取得
 */

import { NextRequest, NextResponse } from 'next/server';

import { successResponse, errorResponse } from '@/lib/api/response';
import { withAuth, type AuthUser } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

/**
 * 顧客一覧取得
 *
 * @query is_active - 有効/無効でフィルタ
 * @query keyword - 顧客名・顧客コードで部分一致検索
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, _user: AuthUser): Promise<NextResponse> => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const isActive = searchParams.get('is_active');
      const keyword = searchParams.get('keyword');

      // フィルタ条件を構築
      const where: {
        isActive?: boolean;
        OR?: Array<{
          name?: { contains: string; mode: 'insensitive' };
          customerCode?: { contains: string; mode: 'insensitive' };
        }>;
      } = {};

      if (isActive !== null) {
        where.isActive = isActive === 'true';
      }

      if (keyword) {
        where.OR = [
          { name: { contains: keyword, mode: 'insensitive' } },
          { customerCode: { contains: keyword, mode: 'insensitive' } },
        ];
      }

      const customers = await prisma.customer.findMany({
        where,
        orderBy: { customerCode: 'asc' },
        select: {
          id: true,
          customerCode: true,
          name: true,
          address: true,
          phone: true,
          isActive: true,
        },
      });

      // APIレスポンス形式に変換
      const data = customers.map((customer) => ({
        id: customer.id,
        customer_code: customer.customerCode,
        name: customer.name,
        address: customer.address,
        phone: customer.phone,
        is_active: customer.isActive,
      }));

      return successResponse(data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      return errorResponse('INTERNAL_ERROR', '顧客一覧の取得に失敗しました');
    }
  });
}
