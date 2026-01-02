/**
 * 文字列ユーティリティ関数
 */

/**
 * 文字列をグラファム（書記素）単位で分割
 * Intl.Segmenterを使用して、絵文字や結合文字を正しく扱う
 * @param str 対象文字列
 * @returns グラファム単位の配列
 */
function getGraphemes(str: string): string[] {
  // Intl.Segmenter が利用可能な場合はグラファム単位で分割
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(str), (s) => s.segment);
  }
  // フォールバック: 単純な文字配列（絵文字が分割される可能性あり）
  return Array.from(str);
}

/**
 * 文字列を指定文字数（グラファム単位）で切り詰め
 *
 * Intl.Segmenterを使用して、絵文字や結合文字を正しく扱います。
 * 環境がIntl.Segmenterをサポートしていない場合は、従来のsliceにフォールバックします。
 *
 * @param str 対象文字列
 * @param maxLength 最大グラファム数
 * @returns 切り詰められた文字列（省略時は末尾に...を付加）
 * @example
 * truncate('Hello 🌍🌎🌏', 10) // 'Hello 🌍🌎🌏' (10グラファム以内なのでそのまま)
 * truncate('Hello 🌍🌎🌏 World', 10) // 'Hello 🌍...' (絵文字が分割されない)
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || typeof str !== 'string') return '';
  if (maxLength < 0) return '';
  if (maxLength === 0) return '';

  const graphemes = getGraphemes(str);

  if (graphemes.length <= maxLength) return str;

  // 省略記号 "..." を含めて maxLength 以内に収める
  if (maxLength <= 3) return graphemes.slice(0, maxLength).join('');

  return graphemes.slice(0, maxLength - 3).join('') + '...';
}

/**
 * HTMLエスケープ
 *
 * 以下の5つの特殊文字をエスケープします:
 * - `&` → `&amp;`
 * - `<` → `&lt;`
 * - `>` → `&gt;`
 * - `"` → `&quot;`
 * - `'` → `&#x27;`
 *
 * @warning この関数は二重エスケープを防止しません。
 * 既にエスケープされた文字列を渡すと、`&amp;` が `&amp;amp;` になります。
 * 使用側で、入力が未エスケープであることを確認してください。
 *
 * @param str エスケープする文字列
 * @returns HTMLエスケープされた文字列
 * @example
 * escapeHtml('<script>alert("XSS")</script>')
 * // '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
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
