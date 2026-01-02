/**
 * 日付フォーマット関連のユーティリティ関数
 */

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

/**
 * 日付を「YYYY年MM月DD日（曜日）」形式にフォーマット
 * @param date Date オブジェクトまたは日付文字列
 * @returns フォーマットされた日付文字列、無効な場合は null
 */
export function formatDateJapanese(date: Date | string | null | undefined): string | null {
  if (!date) return null;

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = WEEKDAYS[d.getDay()];

  return `${year}年${month}月${day}日（${weekday}）`;
}

/**
 * 日付を「YYYY/MM/DD」形式にフォーマット
 * @param date Date オブジェクトまたは日付文字列
 * @returns フォーマットされた日付文字列、無効な場合は null
 */
export function formatDateSlash(date: Date | string | null | undefined): string | null {
  if (!date) return null;

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}/${month}/${day}`;
}

/**
 * 日付を「YYYY-MM-DD」形式にフォーマット（ISO形式、日付のみ）
 * @param date Date オブジェクトまたは日付文字列
 * @returns フォーマットされた日付文字列、無効な場合は null
 */
export function formatDateISO(date: Date | string | null | undefined): string | null {
  if (!date) return null;

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * 日時を「YYYY/MM/DD HH:MM」形式にフォーマット
 * @param date Date オブジェクトまたは日付文字列
 * @returns フォーマットされた日時文字列、無効な場合は null
 */
export function formatDateTime(date: Date | string | null | undefined): string | null {
  if (!date) return null;

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return null;

  const dateStr = formatDateSlash(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${dateStr} ${hours}:${minutes}`;
}

/**
 * 月初の日付を取得
 * @param date 基準となる日付
 * @returns 月初の Date オブジェクト
 */
export function getFirstDayOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * 月末の日付を取得
 * @param date 基準となる日付
 * @returns 月末の Date オブジェクト
 */
export function getLastDayOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * 日付が今日かどうかを判定
 * @param date 判定する日付
 * @returns 今日ならtrue
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();

  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

/**
 * 日付が未来かどうかを判定
 * @param date 判定する日付
 * @returns 未来ならtrue
 */
export function isFutureDate(date: Date | string): boolean {
  // 引数のDateオブジェクトを変更しないようにコピーを作成
  const d = new Date(typeof date === 'string' ? date : date.getTime());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  return d > today;
}

/**
 * 文字列からDateオブジェクトに変換
 * @param dateString 日付文字列（YYYY-MM-DD形式を想定）
 * @returns Dateオブジェクト、無効な場合はnull
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') return null;

  const d = new Date(dateString);

  if (isNaN(d.getTime())) return null;

  return d;
}

/**
 * 今日の日付を取得（YYYY-MM-DD形式）
 * @returns 今日の日付文字列
 */
export function getToday(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
