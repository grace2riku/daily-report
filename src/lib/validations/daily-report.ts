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

// 日報作成リクエストのスキーマ
export const createDailyReportSchema = z.object({
  reportDate: z.string().refine(
    (date) => {
      const d = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return !isNaN(d.getTime()) && d <= today;
    },
    { message: '報告日は本日以前の日付を入力してください' }
  ),
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
