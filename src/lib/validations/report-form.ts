/**
 * 日報フォーム用バリデーションスキーマ（フロントエンド用）
 *
 * React Hook Form + Zod で使用するフォームバリデーション定義
 */

import { z } from 'zod';

/**
 * 日付文字列（YYYY-MM-DD）をローカル日付としてパースする
 */
function parseLocalDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  // 無効な日付（例: 2月30日）をチェック
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return date;
}

/**
 * 日付が未来日でないかチェック（日付のみを比較）
 */
function isDateNotInFuture(dateStr: string): boolean {
  const date = parseLocalDate(dateStr);
  if (!date) return false;

  const today = new Date();
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return dateOnly <= todayDateOnly;
}

/**
 * 訪問記録入力スキーマ
 */
export const visitRecordFormSchema = z.object({
  id: z.number().int().positive().optional(),
  customerId: z.number().int().positive({ message: '顧客を選択してください' }),
  visitTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'HH:MM形式で入力してください' })
    .optional()
    .or(z.literal('')),
  content: z
    .string()
    .min(1, { message: '訪問内容を入力してください' })
    .max(2000, { message: '訪問内容は2000文字以内で入力してください' }),
});

/**
 * 日報フォーム入力スキーマ
 */
export const reportFormSchema = z.object({
  reportDate: z
    .string()
    .min(1, { message: '報告日を入力してください' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'YYYY-MM-DD形式で入力してください' })
    .refine((date) => parseLocalDate(date) !== null, {
      message: '有効な日付を入力してください',
    })
    .refine((date) => isDateNotInFuture(date), {
      message: '報告日は本日以前の日付を入力してください',
    }),
  problem: z
    .string()
    .max(2000, { message: '課題・相談は2000文字以内で入力してください' })
    .optional()
    .or(z.literal('')),
  plan: z
    .string()
    .max(2000, { message: '明日やることは2000文字以内で入力してください' })
    .optional()
    .or(z.literal('')),
  status: z.enum(['draft', 'submitted']),
  visitRecords: z
    .array(visitRecordFormSchema)
    .min(1, { message: '訪問記録を1件以上登録してください' }),
});

/**
 * フォーム入力値の型定義
 */
export type VisitRecordFormValues = z.infer<typeof visitRecordFormSchema>;
export type ReportFormValues = z.infer<typeof reportFormSchema>;

/**
 * エラーメッセージの定義（画面定義書準拠）
 */
export const REPORT_FORM_ERROR_MESSAGES = {
  E101: '報告日を入力してください',
  E102: 'この日付の日報は既に存在します',
  E103: '訪問記録を1件以上登録してください',
  E104: '顧客を選択してください',
  E105: '訪問内容を入力してください',
} as const;

/**
 * デフォルトの訪問記録フォーム値
 */
export const defaultVisitRecordValues: VisitRecordFormValues = {
  customerId: 0,
  visitTime: '',
  content: '',
};

/**
 * デフォルトの日報フォーム値を生成
 */
export function getDefaultReportFormValues(): ReportFormValues {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return {
    reportDate: `${year}-${month}-${day}`,
    problem: '',
    plan: '',
    status: 'draft',
    visitRecords: [{ ...defaultVisitRecordValues }],
  };
}
