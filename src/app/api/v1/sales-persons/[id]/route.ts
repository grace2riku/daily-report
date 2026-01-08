/**
 * 営業担当者詳細API
 *
 * GET /api/v1/sales-persons/{id} - 営業担当者詳細を取得
 * PUT /api/v1/sales-persons/{id} - 営業担当者を更新
 * DELETE /api/v1/sales-persons/{id} - 営業担当者を削除（論理削除）
 */

import { NextRequest, NextResponse } from 'next/server';

import { successResponse, errorResponse } from '@/lib/api/response';
import { withAuth, withAdmin, type AuthUser } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/utils/password';
import { idParamSchema } from '@/lib/validations/common';
import { updateSalesPersonSchema } from '@/lib/validations/sales-person';

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

/**
 * PUT /api/v1/sales-persons/{id}
 *
 * 営業担当者情報を更新する。
 * 管理者のみ実行可能。
 *
 * パスパラメータ:
 * - id: integer - 営業担当者ID
 *
 * リクエストボディ（snake_case）:
 * - name: string - 氏名（任意）
 * - email: string - メールアドレス（任意）
 * - password: string - パスワード（任意、空文字の場合は変更しない）
 * - role: string - 役職（任意）
 * - manager_id: number | null - 上長ID（任意）
 * - is_active: boolean - 有効フラグ（任意）
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

      const salesPersonId = idValidationResult.data;

      // 営業担当者の存在確認
      const existingSalesPerson = await prisma.salesPerson.findUnique({
        where: { id: salesPersonId },
        select: { id: true, email: true },
      });

      if (!existingSalesPerson) {
        return errorResponse('NOT_FOUND', '営業担当者が見つかりません');
      }

      // リクエストボディを取得
      const body = await request.json();

      // snake_case から camelCase に変換
      const camelCaseBody = {
        name: body.name,
        email: body.email,
        password: body.password,
        role: body.role,
        managerId: body.manager_id,
        isActive: body.is_active,
      };

      // バリデーション
      const validationResult = updateSalesPersonSchema.safeParse(camelCaseBody);
      if (!validationResult.success) {
        const issues = validationResult.error.issues;
        const firstError = issues[0];
        return errorResponse('VALIDATION_ERROR', firstError?.message || '入力値が不正です');
      }

      const { name, email, password, role, managerId, isActive } = validationResult.data;

      // メールアドレスの重複チェック（自分以外）
      if (email && email !== existingSalesPerson.email) {
        const duplicateEmail = await prisma.salesPerson.findUnique({
          where: { email },
          select: { id: true },
        });

        if (duplicateEmail) {
          return errorResponse('DUPLICATE_EMAIL', 'このメールアドレスは既に使用されています');
        }
      }

      // manager_idが指定されている場合、存在確認
      if (managerId !== null && managerId !== undefined) {
        // 自分自身を上長に設定できない
        if (managerId === salesPersonId) {
          return errorResponse('VALIDATION_ERROR', '自分自身を上長に設定することはできません');
        }

        const manager = await prisma.salesPerson.findUnique({
          where: { id: managerId },
          select: { id: true },
        });

        if (!manager) {
          return errorResponse('VALIDATION_ERROR', '指定された上長が存在しません');
        }
      }

      // 更新データを構築
      const updateData: {
        name?: string;
        email?: string;
        passwordHash?: string;
        role?: 'member' | 'manager' | 'admin';
        managerId?: number | null;
        isActive?: boolean;
      } = {};

      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (managerId !== undefined) updateData.managerId = managerId;
      if (isActive !== undefined) updateData.isActive = isActive;

      // パスワードが指定されている場合のみハッシュ化して更新
      if (password && password.length > 0) {
        updateData.passwordHash = await hashPassword(password);
      }

      // 営業担当者を更新
      const updatedSalesPerson = await prisma.salesPerson.update({
        where: { id: salesPersonId },
        data: updateData,
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
        },
      });

      // レスポンス形式に変換（snake_case）
      const responseData = {
        id: updatedSalesPerson.id,
        employee_code: updatedSalesPerson.employeeCode,
        name: updatedSalesPerson.name,
        email: updatedSalesPerson.email,
        role: updatedSalesPerson.role,
        manager: updatedSalesPerson.manager
          ? {
              id: updatedSalesPerson.manager.id,
              name: updatedSalesPerson.manager.name,
            }
          : null,
        is_active: updatedSalesPerson.isActive,
        created_at: updatedSalesPerson.createdAt.toISOString(),
        updated_at: updatedSalesPerson.updatedAt.toISOString(),
      };

      return successResponse(responseData);
    } catch (error) {
      console.error('Sales person update error:', error);
      return errorResponse('INTERNAL_ERROR', '営業担当者の更新に失敗しました');
    }
  });
}

/**
 * DELETE /api/v1/sales-persons/{id}
 *
 * 営業担当者を削除する（論理削除: is_active = false）。
 * 管理者のみ実行可能。
 *
 * パスパラメータ:
 * - id: integer - 営業担当者ID
 */
export async function DELETE(
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

      const salesPersonId = idValidationResult.data;

      // 営業担当者の存在確認
      const existingSalesPerson = await prisma.salesPerson.findUnique({
        where: { id: salesPersonId },
        select: { id: true, isActive: true },
      });

      if (!existingSalesPerson) {
        return errorResponse('NOT_FOUND', '営業担当者が見つかりません');
      }

      // 既に無効化されている場合
      if (!existingSalesPerson.isActive) {
        return errorResponse('VALIDATION_ERROR', 'この営業担当者は既に無効化されています');
      }

      // 論理削除（is_active を false に更新）
      await prisma.salesPerson.update({
        where: { id: salesPersonId },
        data: { isActive: false },
      });

      return successResponse({ message: '営業担当者を削除しました' });
    } catch (error) {
      console.error('Sales person delete error:', error);
      return errorResponse('INTERNAL_ERROR', '営業担当者の削除に失敗しました');
    }
  });
}
