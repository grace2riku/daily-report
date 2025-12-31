import { z } from 'zod';

// 訪問記録のスキーマ
export const visitRecordSchema = z.object({
  id: z.number().int().positive().optional(),
  customerId: z.number().int().positive('顧客を選択してください'),
  visitTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'HH:MM形式で入力してください')
    .optional()
    .or(z.literal('')),
  content: z
    .string()
    .min(1, '訪問内容を入力してください')
    .max(2000, '訪問内容は2000文字以内で入力してください'),
});

/**
 * 日付文字列（YYYY-MM-DD）をローカル日付としてパースする
 * new Date("YYYY-MM-DD") はUTCとして解釈されるため、
 * タイムゾーンの差異で日付がずれる問題を回避
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
 * 日付のみを比較（時刻を無視）
 */
function isDateNotInFuture(dateStr: string): boolean {
  const date = parseLocalDate(dateStr);
  if (!date) return false;

  const today = new Date();
  // 日付のみで比較するため、時刻部分をクリア
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return dateOnly <= todayDateOnly;
}

// 日報作成リクエストのスキーマ
export const createDailyReportSchema = z.object({
  reportDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD形式で入力してください')
    .refine((date) => parseLocalDate(date) !== null, {
      message: '有効な日付を入力してください',
    })
    .refine((date) => isDateNotInFuture(date), {
      message: '報告日は本日以前の日付を入力してください',
    }),
  problem: z
    .string()
    .max(2000, '課題・相談は2000文字以内で入力してください')
    .optional()
    .or(z.literal('')),
  plan: z
    .string()
    .max(2000, '明日やることは2000文字以内で入力してください')
    .optional()
    .or(z.literal('')),
  status: z.enum(['draft', 'submitted', 'reviewed']).default('draft'),
  visitRecords: z.array(visitRecordSchema).min(1, '訪問記録を1件以上登録してください'),
});

// 日報更新リクエストのスキーマ
export const updateDailyReportSchema = createDailyReportSchema.partial().extend({
  visitRecords: z.array(visitRecordSchema).optional(),
});

// 日報検索クエリのスキーマ
export const dailyReportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  salesPersonId: z.coerce.number().int().positive().optional(),
  status: z.enum(['draft', 'submitted', 'reviewed']).optional(),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type VisitRecordInput = z.infer<typeof visitRecordSchema>;
export type CreateDailyReportInput = z.infer<typeof createDailyReportSchema>;
export type UpdateDailyReportInput = z.infer<typeof updateDailyReportSchema>;
export type DailyReportQuery = z.infer<typeof dailyReportQuerySchema>;
