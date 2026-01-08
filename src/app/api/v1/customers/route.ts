/**
 * 顧客API
 *
 * GET /api/v1/customers - 顧客一覧を取得
 */

import { NextRequest, NextResponse } from 'next/server';

import {
  paginatedResponse,
  errorResponse,
  calculatePagination,
  calculateOffset,
} from '@/lib/api/response';
import { withAuth, type AuthUser } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { customerQuerySchema } from '@/lib/validations/customer';

/**
 * GET /api/v1/customers
 *
 * 顧客一覧を取得する。
 * 認証が必要。
 *
 * クエリパラメータ:
 * - keyword: string - 顧客名・顧客コードで部分一致検索（OR条件）
 * - is_active: boolean - 有効/無効でフィルタ（省略時はフィルタなし）
 * - page: integer - ページ番号（デフォルト: 1）
 * - per_page: integer - 1ページあたりの件数（デフォルト: 20、最大: 100）
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, _user: AuthUser): Promise<NextResponse> => {
    try {
      // クエリパラメータを取得
      const searchParams = req.nextUrl.searchParams;
      const queryParams = {
        keyword: searchParams.get('keyword') || undefined,
        isActive: searchParams.get('is_active') || undefined,
        page: searchParams.get('page') || undefined,
        perPage: searchParams.get('per_page') || undefined,
      };

      // バリデーション
      const validationResult = customerQuerySchema.safeParse(queryParams);
      if (!validationResult.success) {
        const issues = validationResult.error.issues;
        const firstError = issues[0];
        return errorResponse('VALIDATION_ERROR', firstError?.message || '入力値が不正です');
      }

      const { keyword, isActive, page, perPage } = validationResult.data;

      // 検索条件を構築
      type WhereCondition = {
        isActive?: boolean;
        OR?: Array<{
          name?: { contains: string };
          customerCode?: { contains: string };
        }>;
      };

      const whereCondition: WhereCondition = {};

      // is_activeフィルタ（指定された場合のみ適用）
      if (isActive !== undefined) {
        whereCondition.isActive = isActive;
      }

      // キーワード検索（顧客名・顧客コードで部分一致、OR条件）
      if (keyword) {
        whereCondition.OR = [
          { name: { contains: keyword } },
          { customerCode: { contains: keyword } },
        ];
      }

      // 総件数を取得
      const totalCount = await prisma.customer.count({
        where: whereCondition,
      });

      // ページネーション計算
      const pagination = calculatePagination(page, perPage, totalCount);
      const offset = calculateOffset(page, perPage);

      // 顧客一覧を取得
      const customers = await prisma.customer.findMany({
        where: whereCondition,
        select: {
          id: true,
          customerCode: true,
          name: true,
          address: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: {
          customerCode: 'asc',
        },
        skip: offset,
        take: perPage,
      });

      // レスポンス形式に変換（snake_case）
      const data = customers.map((customer: {
        id: number;
        customerCode: string;
        name: string;
        address: string | null;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
      }) => ({
        id: customer.id,
        customer_code: customer.customerCode,
        name: customer.name,
        address: customer.address,
        phone: customer.phone,
        is_active: customer.isActive,
        created_at: customer.createdAt.toISOString(),
      }));

      return paginatedResponse(data, pagination);
    } catch (error) {
      console.error('Customer list fetch error:', error);
      return errorResponse('INTERNAL_ERROR', '顧客一覧の取得に失敗しました');
    }
  });
}
