/**
 * 認証モジュール
 *
 * JWT認証とCookie操作に関するユーティリティをエクスポートする。
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
