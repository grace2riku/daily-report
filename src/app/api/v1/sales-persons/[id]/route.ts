/**
 * 営業担当者詳細API
 *
 * GET /api/v1/sales-persons/{id} - 営業担当者詳細を取得
 */

import { NextRequest, NextResponse } from 'next/server';

import { successResponse, errorResponse } from '@/lib/api/response';
import { withAuth, type AuthUser } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { idParamSchema } from '@/lib/validations/common';

/**
 * GET /api/v1/sales-persons/{id}
 *
 * 営業担当者詳細を取得する。
 * 認証が必要。
 *
 * パスパラメータ:
 * - id: integer - 営業担当者ID
 *
 * レスポンス:
 * - 200: 営業担当者詳細（上長・部下情報を含む）
 * - 401: 認証エラー
 * - 404: 営業担当者が存在しない
 * - 422: バリデーションエラー
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async (_req, _user: AuthUser): Promise<NextResponse> => {
    try {
      // パスパラメータを取得
      const params = await context.params;
      const idParam = params.id;

      // IDのバリデーション
      const validationResult = idParamSchema.safeParse(idParam);
      if (!validationResult.success) {
        return errorResponse('VALIDATION_ERROR', 'IDは正の整数で指定してください');
      }

      const salesPersonId = validationResult.data;

      // 営業担当者を取得（上長・部下情報を含む）
      const salesPerson = await prisma.salesPerson.findUnique({
        where: { id: salesPersonId },
        select: {
          id: true,
          employeeCode: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          manager: {
            select: {
              id: true,
              name: true,
            },
          },
          subordinates: {
            select: {
              id: true,
              name: true,
            },
            where: {
              isActive: true,
            },
            orderBy: {
              name: 'asc',
            },
          },
        },
      });

      // 営業担当者が存在しない場合
      if (!salesPerson) {
        return errorResponse('NOT_FOUND', '営業担当者が見つかりません');
      }

      // レスポンス形式に変換（snake_case）
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
        subordinates: salesPerson.subordinates.map((subordinate) => ({
          id: subordinate.id,
          name: subordinate.name,
        })),
        is_active: salesPerson.isActive,
        created_at: salesPerson.createdAt.toISOString(),
        updated_at: salesPerson.updatedAt.toISOString(),
      };

      return successResponse(responseData);
    } catch (error) {
      console.error('Sales person detail fetch error:', error);
      return errorResponse('INTERNAL_ERROR', '営業担当者の取得に失敗しました');
    }
  });
}
