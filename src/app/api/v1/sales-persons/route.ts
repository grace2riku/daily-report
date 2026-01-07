/**
 * 営業担当者API
 *
 * GET /api/v1/sales-persons - 営業担当者一覧を取得
 * POST /api/v1/sales-persons - 営業担当者を新規登録（管理者のみ）
 */

import { NextRequest, NextResponse } from 'next/server';

import {
  paginatedResponse,
  successResponse,
  errorResponse,
  calculatePagination,
  calculateOffset,
} from '@/lib/api/response';
import { withAuth, withAdmin, type AuthUser } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/utils/password';
import { salesPersonQuerySchema, createSalesPersonSchema } from '@/lib/validations/sales-person';

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

/**
 * POST /api/v1/sales-persons
 *
 * 営業担当者を新規登録する。
 * 管理者のみ実行可能。
 *
 * リクエストボディ（snake_case）:
 * - employee_code: string - 社員番号（必須、一意）
 * - name: string - 氏名（必須）
 * - email: string - メールアドレス（必須、一意）
 * - password: string - パスワード（必須、8文字以上）
 * - role: string - 役職（member/manager/admin、デフォルト: member）
 * - manager_id: number | null - 上長ID（任意）
 * - is_active: boolean - 有効フラグ（デフォルト: true）
 */
export async function POST(request: NextRequest) {
  return withAdmin(request, async (_req, _user: AuthUser): Promise<NextResponse> => {
    try {
      // リクエストボディを取得
      const body = await request.json();

      // snake_case から camelCase に変換
      const camelCaseBody = {
        employeeCode: body.employee_code,
        name: body.name,
        email: body.email,
        password: body.password,
        role: body.role,
        managerId: body.manager_id,
        isActive: body.is_active,
      };

      // バリデーション
      const validationResult = createSalesPersonSchema.safeParse(camelCaseBody);
      if (!validationResult.success) {
        const issues = validationResult.error.issues;
        const firstError = issues[0];
        return errorResponse('VALIDATION_ERROR', firstError?.message || '入力値が不正です');
      }

      const { employeeCode, name, email, password, role, managerId, isActive } =
        validationResult.data;

      // 社員番号の重複チェック
      const existingEmployeeCode = await prisma.salesPerson.findUnique({
        where: { employeeCode },
        select: { id: true },
      });

      if (existingEmployeeCode) {
        return errorResponse('DUPLICATE_EMPLOYEE_CODE', 'この社員番号は既に使用されています');
      }

      // メールアドレスの重複チェック
      const existingEmail = await prisma.salesPerson.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingEmail) {
        return errorResponse('DUPLICATE_EMAIL', 'このメールアドレスは既に使用されています');
      }

      // manager_idが指定されている場合、存在確認
      if (managerId !== null && managerId !== undefined) {
        const manager = await prisma.salesPerson.findUnique({
          where: { id: managerId },
          select: { id: true },
        });

        if (!manager) {
          return errorResponse('VALIDATION_ERROR', '指定された上長が存在しません');
        }
      }

      // パスワードをハッシュ化
      const passwordHash = await hashPassword(password);

      // 営業担当者を作成
      const salesPerson = await prisma.salesPerson.create({
        data: {
          employeeCode,
          name,
          email,
          passwordHash,
          role,
          managerId: managerId ?? null,
          isActive,
        },
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
      });

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
        is_active: salesPerson.isActive,
        created_at: salesPerson.createdAt.toISOString(),
      };

      return successResponse(responseData);
    } catch (error) {
      console.error('Sales person creation error:', error);
      return errorResponse('INTERNAL_ERROR', '営業担当者の登録に失敗しました');
    }
  });
}
