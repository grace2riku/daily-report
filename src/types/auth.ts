/**
 * 認証関連の型定義
 */

/**
 * ユーザーロール
 */
export type UserRole = 'member' | 'manager' | 'admin';

/**
 * JWTペイロード（トークンに含まれる情報）
 */
export interface JwtPayload {
  /** ユーザーID */
  userId: number;
  /** メールアドレス */
  email: string;
  /** ユーザーロール */
  role: UserRole;
}

/**
 * JWTトークン検証結果
 */
export interface JwtVerifyResult {
  /** 検証成功/失敗 */
  valid: boolean;
  /** ペイロード（検証成功時のみ） */
  payload?: JwtPayload;
  /** エラーメッセージ（検証失敗時のみ） */
  error?: string;
}

/**
 * 認証済みユーザー情報（APIレスポンス用）
 */
export interface AuthenticatedUser {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  role: UserRole;
  manager?: {
    id: number;
    name: string;
  } | null;
}

/**
 * ログインレスポンスデータ
 */
export interface LoginResponseData {
  token: string;
  expiresAt: string;
  user: AuthenticatedUser;
}

/**
 * Cookie設定オプション
 */
export interface CookieOptions {
  /** Cookie名 */
  name: string;
  /** 有効期限（秒） */
  maxAge: number;
  /** HTTPOnly属性 */
  httpOnly: boolean;
  /** Secure属性 */
  secure: boolean;
  /** SameSite属性 */
  sameSite: 'strict' | 'lax' | 'none';
  /** パス */
  path: string;
}
