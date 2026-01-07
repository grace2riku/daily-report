/**
 * 営業担当者一覧API
 *
 * GET /api/v1/sales-persons - 営業担当者一覧を取得
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
import { salesPersonQuerySchema } from '@/lib/validations/sales-person';

/**
 * GET /api/v1/sales-persons
 *
 * 営業担当者一覧を取得する。
 * 認証が必要。
 *
 * クエリパラメータ:
 * - is_active: boolean - 有効/無効でフィルタ（省略時はフィルタなし）
 * - role: string - 役職でフィルタ（member/manager/admin）
 * - page: integer - ページ番号（デフォルト: 1）
 * - per_page: integer - 1ページあたりの件数（デフォルト: 20、最大: 100）
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, _user: AuthUser): Promise<NextResponse> => {
    try {
      // クエリパラメータを取得
      const searchParams = req.nextUrl.searchParams;
      const queryParams = {
        isActive: searchParams.get('is_active') || undefined,
        role: searchParams.get('role') || undefined,
        page: searchParams.get('page') || undefined,
        perPage: searchParams.get('per_page') || undefined,
      };

      // バリデーション
      const validationResult = salesPersonQuerySchema.safeParse(queryParams);
      if (!validationResult.success) {
        const issues = validationResult.error.issues;
        const firstError = issues[0];
        return errorResponse('VALIDATION_ERROR', firstError?.message || '入力値が不正です');
      }

      const { isActive, role, page, perPage } = validationResult.data;

      // 検索条件を構築
      const whereCondition: {
        isActive?: boolean;
        role?: 'member' | 'manager' | 'admin';
      } = {};

      // is_activeフィルタ（指定された場合のみ適用）
      if (isActive !== undefined) {
        whereCondition.isActive = isActive;
      }

      // roleフィルタ（指定された場合のみ適用）
      if (role !== undefined) {
        whereCondition.role = role;
      }

      // 総件数を取得
      const totalCount = await prisma.salesPerson.count({
        where: whereCondition,
      });

      // ページネーション計算
      const pagination = calculatePagination(page, perPage, totalCount);
      const offset = calculateOffset(page, perPage);

      // 営業担当者一覧を取得（上長情報を含む）
      const salesPersons = await prisma.salesPerson.findMany({
        where: whereCondition,
        select: {
          id: true,
          employeeCode: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          manager: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
        skip: offset,
        take: perPage,
      });

      // レスポンス形式に変換
      const data = salesPersons.map((person) => ({
        id: person.id,
        employee_code: person.employeeCode,
        name: person.name,
        email: person.email,
        role: person.role,
        manager: person.manager
          ? {
              id: person.manager.id,
              name: person.manager.name,
            }
          : null,
        is_active: person.isActive,
        created_at: person.createdAt.toISOString(),
      }));

      return paginatedResponse(data, pagination);
    } catch (error) {
      console.error('Sales persons fetch error:', error);
      return errorResponse('INTERNAL_ERROR', '営業担当者一覧の取得に失敗しました');
    }
  });
}
