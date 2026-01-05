import type { Role } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { errorResponse } from '@/lib/api/response';
import prisma from '@/lib/prisma';

import { extractToken, verifyToken } from './jwt';

/**
 * 認証済みユーザー情報の型定義
 */
export interface AuthenticatedUser {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  role: Role;
  managerId: number | null;
  isActive: boolean;
}

/**
 * 認証済みリクエストの型定義
 */
export interface AuthenticatedRequest extends NextRequest {
  user: AuthenticatedUser;
}

/**
 * 認証結果の型定義
 */
type AuthResult =
  | { success: true; user: AuthenticatedUser }
  | { success: false; response: NextResponse };

/**
 * リクエストからユーザーを認証
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  // トークンを抽出
  const token = extractToken(request);
  if (!token) {
    return {
      success: false,
      response: errorResponse('UNAUTHORIZED', '認証トークンが必要です'),
    };
  }

  // トークンを検証
  const payload = await verifyToken(token);
  if (!payload) {
    return {
      success: false,
      response: errorResponse('UNAUTHORIZED', '無効なトークンです'),
    };
  }

  // ユーザー情報をDBから取得
  const user = await prisma.salesPerson.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      employeeCode: true,
      name: true,
      email: true,
      role: true,
      managerId: true,
      isActive: true,
    },
  });

  if (!user) {
    return {
      success: false,
      response: errorResponse('UNAUTHORIZED', 'ユーザーが見つかりません'),
    };
  }

  // アカウントが無効化されている場合
  if (!user.isActive) {
    return {
      success: false,
      response: errorResponse('ACCOUNT_DISABLED', 'アカウントが無効化されています'),
    };
  }

  return { success: true, user };
}

// エラーレスポンスの型定義
type ErrorResponseType = { success: false; error: { code: string; message: string } };

/**
 * 認証が必要なAPIハンドラーをラップするミドルウェア
 */
export function withAuth<T>(
  handler: (
    request: NextRequest,
    user: AuthenticatedUser
  ) => Promise<NextResponse<T | ErrorResponseType>>
): (request: NextRequest) => Promise<NextResponse<T | ErrorResponseType>> {
  return async (request: NextRequest) => {
    const authResult = await authenticateRequest(request);

    if (!authResult.success) {
      return authResult.response as NextResponse<ErrorResponseType>;
    }

    return handler(request, authResult.user);
  };
}

/**
 * 特定のロールが必要なAPIハンドラーをラップするミドルウェア
 */
export function withRole<T>(
  allowedRoles: Role[],
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse<T>>
): (request: NextRequest) => Promise<NextResponse<T | ErrorResponseType>> {
  return withAuth<T>(async (request, user) => {
    if (!allowedRoles.includes(user.role)) {
      return errorResponse(
        'FORBIDDEN',
        'この操作を行う権限がありません'
      ) as NextResponse<ErrorResponseType>;
    }

    return handler(request, user);
  });
}

/**
 * 管理者のみアクセス可能なAPIハンドラーをラップするミドルウェア
 */
export function withAdmin<T>(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse<T>>
): (request: NextRequest) => Promise<NextResponse<T | ErrorResponseType>> {
  return withRole(['admin'], handler);
}

/**
 * 上長または管理者のみアクセス可能なAPIハンドラーをラップするミドルウェア
 */
export function withManagerOrAdmin<T>(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse<T>>
): (request: NextRequest) => Promise<NextResponse<T | ErrorResponseType>> {
  return withRole(['manager', 'admin'], handler);
}
