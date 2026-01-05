/**
 * Cookie操作ヘルパー
 *
 * Next.js App RouterのServer Components/Route Handlersで使用するCookie操作関数。
 * HTTPOnly Cookieを使用してトークンを安全に管理する。
 */

import { cookies } from 'next/headers';

import type { CookieOptions } from '@/types';

import { JWT_CONFIG } from './jwt';

/**
 * 認証トークンCookieの設定
 */
export const AUTH_COOKIE_CONFIG: CookieOptions = {
  name: 'auth_token',
  maxAge: JWT_CONFIG.EXPIRES_IN_SECONDS,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

/**
 * 認証トークンをCookieに設定する
 *
 * HTTPOnly Cookieとして設定されるため、JavaScriptからアクセスできず、
 * XSS攻撃からトークンを保護する。
 *
 * @param token - 設定するJWTトークン
 *
 * @example
 * ```typescript
 * // Route Handler内で使用
 * await setAuthCookie(token);
 * ```
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_CONFIG.name, token, {
    maxAge: AUTH_COOKIE_CONFIG.maxAge,
    httpOnly: AUTH_COOKIE_CONFIG.httpOnly,
    secure: AUTH_COOKIE_CONFIG.secure,
    sameSite: AUTH_COOKIE_CONFIG.sameSite,
    path: AUTH_COOKIE_CONFIG.path,
  });
}

/**
 * Cookieから認証トークンを取得する
 *
 * @returns トークン文字列、またはCookieが存在しない場合はundefined
 *
 * @example
 * ```typescript
 * const token = await getAuthCookie();
 * if (token) {
 *   const result = await verifyToken(token);
 *   // ...
 * }
 * ```
 */
export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(AUTH_COOKIE_CONFIG.name);

  return cookie?.value;
}

/**
 * 認証トークンCookieを削除する
 *
 * ログアウト時に使用する。Cookieを即座に無効化するために、
 * maxAgeを0に設定して削除する。
 *
 * @example
 * ```typescript
 * // ログアウト処理
 * await clearAuthCookie();
 * ```
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_CONFIG.name, '', {
    maxAge: 0,
    httpOnly: AUTH_COOKIE_CONFIG.httpOnly,
    secure: AUTH_COOKIE_CONFIG.secure,
    sameSite: AUTH_COOKIE_CONFIG.sameSite,
    path: AUTH_COOKIE_CONFIG.path,
  });
}

/**
 * 認証Cookieが存在するかチェックする
 *
 * @returns Cookieが存在する場合はtrue
 *
 * @example
 * ```typescript
 * if (await hasAuthCookie()) {
 *   // ログイン済みの処理
 * }
 * ```
 */
export async function hasAuthCookie(): Promise<boolean> {
  const token = await getAuthCookie();
  return token !== undefined && token.length > 0;
}
