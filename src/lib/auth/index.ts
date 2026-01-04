/**
 * 認証モジュール
 *
 * JWT認証、Cookie操作、認証ミドルウェアに関するユーティリティをエクスポートする。
 */

// JWT関連
export {
  generateToken,
  verifyToken,
  decodeToken,
  calculateTokenExpiry,
  extractTokenFromHeader,
  JWT_CONFIG,
} from './jwt';

// Cookie関連
export {
  setAuthCookie,
  getAuthCookie,
  clearAuthCookie,
  hasAuthCookie,
  AUTH_COOKIE_CONFIG,
} from './cookie';

// ミドルウェア関連
export {
  withAuth,
  withRole,
  withAdmin,
  isSubordinate,
  canViewReport,
  canPostComment,
  canEditReport,
  canManageMaster,
} from './middleware';

// ミドルウェアの型定義
export type { AuthUser, AuthenticatedHandler } from './middleware';
