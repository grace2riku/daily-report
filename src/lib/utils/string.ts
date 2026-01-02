/**
 * 文字列ユーティリティ関数
 */

/**
 * 文字列を指定文字数で切り詰め
 * @param str 対象文字列
 * @param maxLength 最大文字数
 * @returns 切り詰められた文字列（省略時は末尾に...を付加）
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || typeof str !== 'string') return '';
  if (maxLength < 0) return '';
  if (maxLength === 0) return '';

  if (str.length <= maxLength) return str;

  // 省略記号 "..." を含めて maxLength 以内に収める
  if (maxLength <= 3) return str.slice(0, maxLength);

  return str.slice(0, maxLength - 3) + '...';
}

/**
 * HTMLエスケープ
 * @param str エスケープする文字列
 * @returns HTMLエスケープされた文字列
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';

  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };

  return str.replace(/[&<>"']/g, (char) => escapeMap[char]);
}
