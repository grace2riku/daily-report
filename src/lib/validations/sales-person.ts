import { z } from 'zod';

import { paginationSchema, roleSchema } from './common';

// 社員番号スキーマ（再利用可能）
export const employeeCodeSchema = z
  .string()
  .min(1, '社員番号を入力してください')
  .max(20, '社員番号は20文字以内で入力してください')
  .regex(/^[a-zA-Z0-9]+$/, '社員番号は半角英数字で入力してください');

// メールアドレススキーマ（再利用可能）
export const emailSchema = z
  .string()
  .min(1, 'メールアドレスを入力してください')
  .email('有効なメールアドレスを入力してください')
  .max(255, 'メールアドレスは255文字以内で入力してください');

// パスワードスキーマ（新規登録用）
export const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上で入力してください')
  .max(100, 'パスワードは100文字以内で入力してください');

// 営業担当者作成リクエストのスキーマ
export const createSalesPersonSchema = z.object({
  employeeCode: employeeCodeSchema,
  name: z.string().min(1, '氏名を入力してください').max(100, '氏名は100文字以内で入力してください'),
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema.default('member'),
  managerId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
});

// 営業担当者更新リクエストのスキーマ
export const updateSalesPersonSchema = createSalesPersonSchema
  .partial()
  .omit({ employeeCode: true })
  .extend({
    password: passwordSchema.optional().or(z.literal('')),
  });

// 営業担当者検索クエリのスキーマ
export const salesPersonQuerySchema = z
  .object({
    isActive: z
      .string()
      .transform((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return undefined;
      })
      .optional(),
    role: roleSchema.optional(),
  })
  .merge(paginationSchema);

export type CreateSalesPersonInput = z.infer<typeof createSalesPersonSchema>;
export type UpdateSalesPersonInput = z.infer<typeof updateSalesPersonSchema>;
export type SalesPersonQuery = z.infer<typeof salesPersonQuerySchema>;
