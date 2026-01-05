/**
 * 認証ミドルウェア
 *
 * Next.js API RouteでJWT認証とロールベースアクセス制御を提供する。
 */

import { NextRequest, NextResponse } from 'next/server';

import { errorResponse } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';
import type { UserRole } from '@/types';

import { verifyToken, extractTokenFromHeader } from './jwt';

/**
 * 認証済みユーザー情報
 */
export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
}

/**
 * 認証ハンドラーの型
 */
export type AuthenticatedHandler<T = unknown> = (
  request: NextRequest,
  user: AuthUser
) => Promise<NextResponse<T>>;

/**
 * 認証チェックを行うミドルウェア
 *
 * AuthorizationヘッダーからJWTトークンを検証し、
 * 有効なトークンであればユーザー情報を含めてハンドラーを実行する。
 *
 * @param request - Next.jsリクエストオブジェクト
 * @param handler - 認証成功時に実行するハンドラー
 * @returns ハンドラーの戻り値またはエラーレスポンス
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return withAuth(request, async (req, user) => {
 *     // user.id, user.email, user.role が利用可能
 *     return successResponse({ userId: user.id });
 *   });
 * }
 * ```
 */
export async function withAuth<T>(
  request: NextRequest,
  handler: AuthenticatedHandler<T>
): Promise<NextResponse<T> | NextResponse> {
  // Authorizationヘッダーからトークンを抽出
  const authHeader = request.headers.get('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return errorResponse('UNAUTHORIZED', '認証が必要です');
  }

  // トークンを検証
  const result = await verifyToken(token);

  if (!result.valid || !result.payload) {
    return errorResponse('UNAUTHORIZED', result.error || '認証に失敗しました');
  }

  // ユーザー情報を構築
  const user: AuthUser = {
    id: result.payload.userId,
    email: result.payload.email,
    role: result.payload.role,
  };

  // ハンドラーを実行
  return handler(request, user);
}

/**
 * 特定ロールのみアクセス可能にするミドルウェア
 *
 * 認証チェックに加えて、指定されたロールのいずれかを持つユーザーのみ
 * ハンドラーを実行する。
 *
 * @param request - Next.jsリクエストオブジェクト
 * @param allowedRoles - 許可するロールの配列
 * @param handler - 認証・認可成功時に実行するハンドラー
 * @returns ハンドラーの戻り値またはエラーレスポンス
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   return withRole(request, ['manager', 'admin'], async (req, user) => {
 *     // manager または admin のみ実行可能
 *     return successResponse({ success: true });
 *   });
 * }
 * ```
 */
export async function withRole<T>(
  request: NextRequest,
  allowedRoles: UserRole[],
  handler: AuthenticatedHandler<T>
): Promise<NextResponse<T> | NextResponse> {
  // Authorizationヘッダーからトークンを抽出
  const authHeader = request.headers.get('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return errorResponse('UNAUTHORIZED', '認証が必要です');
  }

  // トークンを検証
  const result = await verifyToken(token);

  if (!result.valid || !result.payload) {
    return errorResponse('UNAUTHORIZED', result.error || '認証に失敗しました');
  }

  // ユーザー情報を構築
  const user: AuthUser = {
    id: result.payload.userId,
    email: result.payload.email,
    role: result.payload.role,
  };

  // ロールチェック
  if (!allowedRoles.includes(user.role)) {
    return errorResponse('FORBIDDEN', 'この操作を行う権限がありません');
  }

  // ハンドラーを実行
  return handler(request, user);
}

/**
 * 管理者のみアクセス可能にするミドルウェア
 *
 * withRoleのショートカットで、adminロールのみアクセスを許可する。
 *
 * @param request - Next.jsリクエストオブジェクト
 * @param handler - 認証・認可成功時に実行するハンドラー
 * @returns ハンドラーの戻り値またはエラーレスポンス
 *
 * @example
 * ```typescript
 * export async function DELETE(request: NextRequest) {
 *   return withAdmin(request, async (req, user) => {
 *     // admin のみ実行可能
 *     return successResponse({ message: '削除しました' });
 *   });
 * }
 * ```
 */
export async function withAdmin<T>(
  request: NextRequest,
  handler: AuthenticatedHandler<T>
): Promise<NextResponse<T> | NextResponse> {
  return withRole(request, ['admin'], handler);
}

/**
 * 対象ユーザーが指定マネージャーの部下かどうかを判定
 *
 * データベースを参照し、targetUserIdのmanager_idがmanagerIdと一致するか確認する。
 *
 * @param managerId - マネージャーのユーザーID
 * @param targetUserId - 対象ユーザーのID
 * @returns 部下であればtrue、そうでなければfalse
 *
 * @example
 * ```typescript
 * const canAccess = await isSubordinate(currentUser.id, report.salesPersonId);
 * if (!canAccess) {
 *   return errorResponse('FORBIDDEN', 'アクセス権限がありません');
 * }
 * ```
 */
export async function isSubordinate(managerId: number, targetUserId: number): Promise<boolean> {
  // 同じユーザーの場合はfalse（自分は自分の部下ではない）
  if (managerId === targetUserId) {
    return false;
  }

  const targetUser = await prisma.salesPerson.findUnique({
    where: { id: targetUserId },
    select: { managerId: true },
  });

  if (!targetUser) {
    return false;
  }

  return targetUser.managerId === managerId;
}

/**
 * ユーザーが日報を閲覧できるかを判定
 *
 * 権限マトリックスに基づいて閲覧権限を判定する:
 * - member: 自分の日報のみ
 * - manager: 自分の日報 + 部下の日報
 * - admin: すべての日報
 *
 * @param user - 認証済みユーザー情報
 * @param reportOwnerId - 日報作成者のユーザーID
 * @returns 閲覧可能であればtrue、そうでなければfalse
 *
 * @example
 * ```typescript
 * const report = await prisma.dailyReport.findUnique({ ... });
 * const canView = await canViewReport(user, report.salesPersonId);
 * if (!canView) {
 *   return errorResponse('FORBIDDEN', 'この日報を閲覧する権限がありません');
 * }
 * ```
 */
export async function canViewReport(user: AuthUser, reportOwnerId: number): Promise<boolean> {
  // adminは全ての日報を閲覧可能
  if (user.role === 'admin') {
    return true;
  }

  // 自分の日報は閲覧可能
  if (user.id === reportOwnerId) {
    return true;
  }

  // managerは部下の日報を閲覧可能
  if (user.role === 'manager') {
    return isSubordinate(user.id, reportOwnerId);
  }

  // memberは自分の日報のみ（上記で処理済み）
  return false;
}

/**
 * ユーザーがコメントを投稿できるかを判定
 *
 * 権限マトリックスに基づいてコメント権限を判定する:
 * - member: コメント不可
 * - manager: 部下の日報にコメント可能
 * - admin: すべての日報にコメント可能
 *
 * @param user - 認証済みユーザー情報
 * @param reportOwnerId - 日報作成者のユーザーID
 * @returns コメント可能であればtrue、そうでなければfalse
 *
 * @example
 * ```typescript
 * const canComment = await canPostComment(user, report.salesPersonId);
 * if (!canComment) {
 *   return errorResponse('FORBIDDEN', 'コメント投稿権限がありません');
 * }
 * ```
 */
export async function canPostComment(user: AuthUser, reportOwnerId: number): Promise<boolean> {
  // adminはすべての日報にコメント可能
  if (user.role === 'admin') {
    return true;
  }

  // managerは部下の日報にコメント可能
  if (user.role === 'manager') {
    return isSubordinate(user.id, reportOwnerId);
  }

  // memberはコメント不可
  return false;
}

/**
 * ユーザーが日報を編集/削除できるかを判定
 *
 * 本人のみ編集/削除可能
 *
 * @param user - 認証済みユーザー情報
 * @param reportOwnerId - 日報作成者のユーザーID
 * @returns 編集可能であればtrue、そうでなければfalse
 */
export function canEditReport(user: AuthUser, reportOwnerId: number): boolean {
  return user.id === reportOwnerId;
}

/**
 * ユーザーがマスタ管理操作を行えるかを判定
 *
 * 管理者のみマスタ管理可能
 *
 * @param user - 認証済みユーザー情報
 * @returns マスタ管理可能であればtrue、そうでなければfalse
 */
export function canManageMaster(user: AuthUser): boolean {
  return user.role === 'admin';
}
