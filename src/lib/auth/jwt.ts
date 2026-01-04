/**
 * JWT認証ユーティリティ
 *
 * joseライブラリを使用してJWTトークンの生成、検証、デコードを行う。
 * Edge Runtimeと互換性があり、Web Crypto APIを使用。
 */

import { SignJWT, jwtVerify, decodeJwt } from 'jose';

import type { JwtPayload, JwtVerifyResult, UserRole } from '@/types';

/**
 * JWT設定
 */
export const JWT_CONFIG = {
  /** トークンの有効期限 */
  EXPIRES_IN: '24h',
  /** トークンの有効期限（秒） */
  EXPIRES_IN_SECONDS: 24 * 60 * 60,
  /** アルゴリズム */
  ALGORITHM: 'HS256' as const,
  /** Issuer */
  ISSUER: 'daily-report-system',
  /** Audience */
  AUDIENCE: 'daily-report-users',
} as const;

/**
 * 環境変数からJWTシークレットを取得
 *
 * @throws {Error} JWT_SECRETが設定されていない場合
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is not set. Please set it in your .env file.'
    );
  }
  // シークレットをUint8Arrayに変換（joseライブラリで必要）
  return new TextEncoder().encode(secret);
}

/**
 * JWTトークンを生成する
 *
 * @param payload - トークンに含める情報
 * @returns 生成されたJWTトークン
 * @throws {Error} トークン生成に失敗した場合
 *
 * @example
 * ```typescript
 * const token = await generateToken({
 *   userId: 1,
 *   email: 'user@example.com',
 *   role: 'member'
 * });
 * ```
 */
export async function generateToken(payload: JwtPayload): Promise<string> {
  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: JWT_CONFIG.ALGORITHM })
    .setIssuedAt(now)
    .setIssuer(JWT_CONFIG.ISSUER)
    .setAudience(JWT_CONFIG.AUDIENCE)
    .setExpirationTime(JWT_CONFIG.EXPIRES_IN)
    .sign(secret);

  return token;
}

/**
 * JWTトークンを検証する
 *
 * @param token - 検証するJWTトークン
 * @returns 検証結果とペイロード
 *
 * @example
 * ```typescript
 * const result = await verifyToken(token);
 * if (result.valid && result.payload) {
 *   console.log('User ID:', result.payload.userId);
 * } else {
 *   console.error('Token invalid:', result.error);
 * }
 * ```
 */
export async function verifyToken(token: string): Promise<JwtVerifyResult> {
  if (!token) {
    return {
      valid: false,
      error: 'Token is required',
    };
  }

  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
    });

    // ペイロードの必須フィールドを検証
    const userId = payload.userId;
    const email = payload.email;
    const role = payload.role;

    if (typeof userId !== 'number') {
      return {
        valid: false,
        error: 'Invalid payload: userId must be a number',
      };
    }

    if (typeof email !== 'string') {
      return {
        valid: false,
        error: 'Invalid payload: email must be a string',
      };
    }

    if (!isValidRole(role)) {
      return {
        valid: false,
        error: 'Invalid payload: role must be member, manager, or admin',
      };
    }

    return {
      valid: true,
      payload: {
        userId,
        email,
        role,
      },
    };
  } catch (error) {
    // エラーの種類に応じたメッセージを返す
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return {
          valid: false,
          error: 'Token has expired',
        };
      }
      if (
        error.message.includes('signature') ||
        error.message.includes('verification')
      ) {
        return {
          valid: false,
          error: 'Invalid token signature',
        };
      }
      if (error.message.includes('malformed')) {
        return {
          valid: false,
          error: 'Token is malformed',
        };
      }
    }

    return {
      valid: false,
      error: 'Token verification failed',
    };
  }
}

/**
 * JWTトークンをデコードする（署名検証なし）
 *
 * 注意: この関数は署名検証を行わないため、トークンの信頼性は保証されません。
 * デバッグやトークン内容の確認にのみ使用してください。
 *
 * @param token - デコードするJWTトークン
 * @returns デコードされたペイロード、またはデコードに失敗した場合はnull
 *
 * @example
 * ```typescript
 * const payload = decodeToken(token);
 * if (payload) {
 *   console.log('Token contains user:', payload.email);
 * }
 * ```
 */
export function decodeToken(token: string): JwtPayload | null {
  if (!token) {
    return null;
  }

  try {
    const payload = decodeJwt(token);

    const userId = payload.userId;
    const email = payload.email;
    const role = payload.role;

    // 必須フィールドの検証
    if (
      typeof userId !== 'number' ||
      typeof email !== 'string' ||
      !isValidRole(role)
    ) {
      return null;
    }

    return {
      userId,
      email,
      role,
    };
  } catch {
    return null;
  }
}

/**
 * トークンの有効期限を計算する
 *
 * @returns 有効期限のISO 8601形式の文字列
 */
export function calculateTokenExpiry(): string {
  const expiryDate = new Date(
    Date.now() + JWT_CONFIG.EXPIRES_IN_SECONDS * 1000
  );
  return expiryDate.toISOString();
}

/**
 * ロールが有効かどうかを検証する
 *
 * @param role - 検証するロール
 * @returns ロールが有効な場合はtrue
 */
function isValidRole(role: unknown): role is UserRole {
  return role === 'member' || role === 'manager' || role === 'admin';
}

/**
 * Authorizationヘッダーからトークンを抽出する
 *
 * @param authHeader - Authorizationヘッダーの値
 * @returns トークン文字列、またはnull
 *
 * @example
 * ```typescript
 * const token = extractTokenFromHeader('Bearer eyJhbGc...');
 * ```
 */
export function extractTokenFromHeader(
  authHeader: string | null
): string | null {
  if (!authHeader) {
    return null;
  }

  // Bearer トークン形式を検証
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}
