/**
 * バリデーション関連のユーティリティ関数
 */

/**
 * メールアドレスが有効かどうかを検証
 * @param email 検証するメールアドレス
 * @returns 有効ならtrue
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;

  // RFC 5322 に基づいた正規表現（簡易版）
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 電話番号が有効かどうかを検証（日本の電話番号形式）
 * @param phone 検証する電話番号
 * @returns 有効ならtrue
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;

  // 日本の電話番号形式（ハイフンあり・なし両対応）
  // 固定電話: 0X-XXXX-XXXX, 0XX-XXX-XXXX, 0XXX-XX-XXXX など
  // 携帯電話: 090-XXXX-XXXX, 080-XXXX-XXXX, 070-XXXX-XXXX など
  const phoneRegex = /^0\d{1,4}-?\d{1,4}-?\d{3,4}$/;
  return phoneRegex.test(phone);
}

/**
 * 社員番号が有効かどうかを検証
 * @param code 検証する社員番号
 * @returns 有効ならtrue
 */
export function isValidEmployeeCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;

  // 半角英数字、1〜20文字
  const codeRegex = /^[a-zA-Z0-9]{1,20}$/;
  return codeRegex.test(code);
}

/**
 * 顧客コードが有効かどうかを検証
 * @param code 検証する顧客コード
 * @returns 有効ならtrue
 */
export function isValidCustomerCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;

  // 半角英数字、1〜20文字
  const codeRegex = /^[a-zA-Z0-9]{1,20}$/;
  return codeRegex.test(code);
}

/**
 * 時刻形式（HH:MM）が有効かどうかを検証
 * @param time 検証する時刻文字列
 * @returns 有効ならtrue
 */
export function isValidTimeFormat(time: string): boolean {
  if (!time || typeof time !== 'string') return false;

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}
