/**
 * POST /api/v1/auth/login
 *
 * ログイン認証を行い、アクセストークンを取得する。
 */

import { NextRequest } from 'next/server';

import { successResponse, errorResponse } from '@/lib/api/response';
import { setAuthCookie } from '@/lib/auth/cookie';
import { generateToken, calculateTokenExpiry } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/utils/password';
import { loginSchema } from '@/lib/validations/auth';

/**
 * ログインレスポンス用のユーザーデータ型
 */
interface LoginUserResponse {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  role: 'member' | 'manager' | 'admin';
}

/**
 * ログインレスポンスデータ型
 */
interface LoginResponseData {
  token: string;
  expires_at: string;
  user: LoginUserResponse;
}

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.json();

    // バリデーション
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      // バリデーションエラーの詳細を取得（Zod v4ではissuesプロパティを使用）
      const firstIssue = validationResult.error.issues[0];
      return errorResponse('VALIDATION_ERROR', firstIssue.message);
    }

    const { email, password } = validationResult.data;

    // メールアドレスでユーザー検索
    const user = await prisma.salesPerson.findUnique({
      where: { email },
    });

    // ユーザーが存在しない場合
    if (!user) {
      return errorResponse('INVALID_CREDENTIALS');
    }

    // アカウントが無効化されている場合
    if (!user.isActive) {
      return errorResponse('ACCOUNT_DISABLED');
    }

    // パスワード検証
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return errorResponse('INVALID_CREDENTIALS');
    }

    // JWTトークン生成
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // トークンの有効期限を計算
    const expiresAt = calculateTokenExpiry();

    // HttpOnly Cookieにトークン設定
    await setAuthCookie(token);

    // レスポンスデータ作成
    const responseData: LoginResponseData = {
      token,
      expires_at: expiresAt,
      user: {
        id: user.id,
        employee_code: user.employeeCode,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };

    return successResponse(responseData);
  } catch (error) {
    // JSON パースエラー
    if (error instanceof SyntaxError) {
      return errorResponse('BAD_REQUEST', 'リクエストボディが不正です');
    }

    // その他のエラー
    console.error('Login error:', error);
    return errorResponse('INTERNAL_ERROR');
  }
}
