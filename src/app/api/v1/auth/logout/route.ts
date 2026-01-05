/**
 * POST /api/v1/auth/logout
 *
 * ログアウト処理を行う。
 *
 * 処理フロー:
 * 1. 認証ミドルウェア（withAuth）でトークン検証
 * 2. 認証失敗 → UNAUTHORIZED
 * 3. Cookieからトークン削除（clearAuthCookie）
 * 4. 成功レスポンス返却
 */

import { NextRequest } from 'next/server';

import { successResponse } from '@/lib/api/response';
import { clearAuthCookie } from '@/lib/auth/cookie';
import { withAuth } from '@/lib/auth/middleware';

/**
 * ログアウトレスポンスデータ型
 */
interface LogoutResponseData {
  message: string;
}

export async function POST(request: NextRequest) {
  return withAuth(request, async () => {
    // Cookieからトークンを削除
    await clearAuthCookie();

    // 成功レスポンスを返却
    const responseData: LogoutResponseData = {
      message: 'ログアウトしました',
    };

    return successResponse(responseData);
  });
}
