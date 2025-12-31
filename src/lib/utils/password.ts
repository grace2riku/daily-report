/**
 * パスワード関連のユーティリティ関数
 * サーバーサイドでのみ使用可能
 */

import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * パスワードをハッシュ化
 * @param password 平文パスワード
 * @returns ハッシュ化されたパスワード
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * パスワードを検証
 * @param password 平文パスワード
 * @param hash ハッシュ化されたパスワード
 * @returns パスワードが一致すればtrue
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
