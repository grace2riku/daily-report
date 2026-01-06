import { z } from 'zod';

/**
 * 共通バリデーションスキーマ
 */

// IDパラメータ（パスパラメータ用 - オブジェクト形式）
export const idParamSchema = z.coerce.number().int().positive('IDは正の整数である必要があります');

// IDパラメータ（パスパラメータ用 - オブジェクト形式）
export const idParamObjectSchema = z.object({
  id: z.coerce.number().int().positive('IDは正の整数である必要があります'),
});

// 日報IDパラメータ（コメントAPI用）
export const reportIdParamSchema = z.object({
  reportId: z.coerce.number().int().positive('日報IDは正の整数である必要があります'),
});

// ページネーションパラメータ
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce
    .number()
    .int()
    .min(1, '1ページあたりの件数は1以上で指定してください')
    .max(100, '1ページあたりの件数は100以下で指定してください')
    .default(20),
});

// 日付範囲パラメータ
export const dateRangeSchema = z
  .object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD形式で入力してください')
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD形式で入力してください')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: '開始日は終了日以前の日付を指定してください',
      path: ['startDate'],
    }
  );

// 有効/無効フィルタパラメータ
export const isActiveFilterSchema = z.object({
  isActive: z
    .string()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    })
    .optional(),
});

// 役職（ロール）の列挙型
export const roleSchema = z.enum(['member', 'manager', 'admin']);

// 日報ステータスの列挙型
export const reportStatusSchema = z.enum(['draft', 'submitted', 'reviewed']);

// 共通の型エクスポート
export type IdParam = z.infer<typeof idParamSchema>;
export type IdParamObject = z.infer<typeof idParamObjectSchema>;
export type ReportIdParam = z.infer<typeof reportIdParamSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
export type DateRangeParams = z.infer<typeof dateRangeSchema>;
export type IsActiveFilter = z.infer<typeof isActiveFilterSchema>;
export type Role = z.infer<typeof roleSchema>;
export type ReportStatus = z.infer<typeof reportStatusSchema>;
