/**
 * 顧客詳細API
 *
 * GET /api/v1/customers/{id} - 顧客詳細を取得
 * PUT /api/v1/customers/{id} - 顧客情報を更新（管理者のみ）
 */

import { NextRequest, NextResponse } from 'next/server';

import { successResponse, errorResponse } from '@/lib/api/response';
import { withAuth, withAdmin, type AuthUser } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { idParamSchema } from '@/lib/validations/common';
import { updateCustomerSchema } from '@/lib/validations/customer';

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

/**
 * PUT /api/v1/customers/{id}
 *
 * 顧客情報を更新する。
 * 管理者のみ実行可能。
 *
 * パスパラメータ:
 * - id: integer - 顧客ID
 *
 * リクエストボディ（snake_case）:
 * - name: string - 顧客名（任意）
 * - address: string - 住所（任意）
 * - phone: string - 電話番号（任意）
 * - is_active: boolean - 有効フラグ（任意）
 *
 * レスポンス:
 * - 200: 更新後の顧客情報
 * - 401: 認証エラー
 * - 403: 権限エラー（管理者以外）
 * - 404: 顧客が存在しない
 * - 422: バリデーションエラー
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAdmin(request, async (_req, _user: AuthUser): Promise<NextResponse> => {
    try {
      // パスパラメータを取得
      const params = await context.params;
      const idParam = params.id;

      // IDのバリデーション
      const idValidationResult = idParamSchema.safeParse(idParam);
      if (!idValidationResult.success) {
        return errorResponse('VALIDATION_ERROR', 'IDは正の整数で指定してください');
      }

      const customerId = idValidationResult.data;

      // 顧客の存在確認
      const existingCustomer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true },
      });

      if (!existingCustomer) {
        return errorResponse('NOT_FOUND', '顧客が見つかりません');
      }

      // リクエストボディを取得
      const body = await request.json();

      // snake_case から camelCase に変換
      const camelCaseBody = {
        name: body.name,
        address: body.address,
        phone: body.phone,
        isActive: body.is_active,
      };

      // バリデーション
      const validationResult = updateCustomerSchema.safeParse(camelCaseBody);
      if (!validationResult.success) {
        const issues = validationResult.error.issues;
        const firstError = issues[0];
        return errorResponse('VALIDATION_ERROR', firstError?.message || '入力値が不正です');
      }

      const { name, address, phone, isActive } = validationResult.data;

      // 更新データを構築
      const updateData: {
        name?: string;
        address?: string | null;
        phone?: string | null;
        isActive?: boolean;
      } = {};

      if (name !== undefined) updateData.name = name;
      if (address !== undefined) updateData.address = address || null;
      if (phone !== undefined) updateData.phone = phone || null;
      if (isActive !== undefined) updateData.isActive = isActive;

      // 顧客を更新
      const updatedCustomer = await prisma.customer.update({
        where: { id: customerId },
        data: updateData,
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

      // レスポンス形式に変換（snake_case）
      const responseData = {
        id: updatedCustomer.id,
        customer_code: updatedCustomer.customerCode,
        name: updatedCustomer.name,
        address: updatedCustomer.address,
        phone: updatedCustomer.phone,
        is_active: updatedCustomer.isActive,
        created_at: updatedCustomer.createdAt.toISOString(),
        updated_at: updatedCustomer.updatedAt.toISOString(),
      };

      return successResponse(responseData);
    } catch (error) {
      console.error('Customer update error:', error);
      return errorResponse('INTERNAL_ERROR', '顧客の更新に失敗しました');
    }
  });
}
