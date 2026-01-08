/**
 * 顧客詳細API
 *
 * GET /api/v1/customers/{id} - 顧客詳細を取得
 */

import { NextRequest, NextResponse } from 'next/server';

import { successResponse, errorResponse } from '@/lib/api/response';
import { withAuth, type AuthUser } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { idParamSchema } from '@/lib/validations/common';

/**
 * GET /api/v1/customers/{id}
 *
 * 顧客詳細を取得する。
 * 認証が必要。
 *
 * パスパラメータ:
 * - id: integer - 顧客ID
 *
 * レスポンス:
 * - 200: 顧客詳細
 * - 401: 認証エラー
 * - 404: 顧客が存在しない
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

      const customerId = validationResult.data;

      // 顧客を取得
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          customerCode: true,
          name: true,
          address: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // 顧客が存在しない場合
      if (!customer) {
        return errorResponse('NOT_FOUND', '顧客が見つかりません');
      }

      // レスポンス形式に変換（snake_case）
      const responseData = {
        id: customer.id,
        customer_code: customer.customerCode,
        name: customer.name,
        address: customer.address,
        phone: customer.phone,
        is_active: customer.isActive,
        created_at: customer.createdAt.toISOString(),
        updated_at: customer.updatedAt.toISOString(),
      };

      return successResponse(responseData);
    } catch (error) {
      console.error('Customer detail fetch error:', error);
      return errorResponse('INTERNAL_ERROR', '顧客の取得に失敗しました');
    }
  });
}
