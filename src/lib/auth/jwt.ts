import jwt from 'jsonwebtoken';

/**
 * JWT関連のユーティリティ関数
 */

// JWTペイロードの型定義
export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// JWT設定
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * 有効期限の文字列を解析して秒数を返す
 */
function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 24 * 60 * 60; // デフォルト: 24時間
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 24 * 60 * 60;
    default:
      return 24 * 60 * 60;
  }
}

/**
 * JWTトークンを生成
 */
export async function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const expiresInSeconds = parseExpiresIn(JWT_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  const token = jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: expiresInSeconds,
    }
  );

  return { token, expiresAt };
}

/**
 * JWTトークンを検証
 */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as jwt.JwtPayload;

    // ペイロードの型を検証
    if (
      typeof payload.userId !== 'number' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }

    return {
      userId: payload.userId as number,
      email: payload.email as string,
      role: payload.role as string,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * リクエストからトークンを抽出
 * Authorization ヘッダーまたは Cookie から取得
 */
export function extractToken(request: Request): string | null {
  // Authorization ヘッダーから取得
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Cookie から取得
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map((c) => {
        const [key, ...value] = c.split('=');
        return [key, value.join('=')];
      })
    );
    if (cookies.token) {
      return cookies.token;
    }
  }

  return null;
}
