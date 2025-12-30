import { z } from 'zod';

// 営業担当者作成リクエストのスキーマ
export const createSalesPersonSchema = z.object({
  employeeCode: z
    .string()
    .min(1, '社員番号を入力してください')
    .max(20, '社員番号は20文字以内で入力してください')
    .regex(/^[a-zA-Z0-9]+$/, '社員番号は半角英数字で入力してください'),
  name: z.string().min(1, '氏名を入力してください').max(100, '氏名は100文字以内で入力してください'),
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください')
    .max(255, 'メールアドレスは255文字以内で入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(100, 'パスワードは100文字以内で入力してください'),
  role: z.enum(['member', 'manager', 'admin']).default('member'),
  managerId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
});

// 営業担当者更新リクエストのスキーマ
export const updateSalesPersonSchema = createSalesPersonSchema
  .partial()
  .omit({ employeeCode: true })
  .extend({
    password: z
      .string()
      .min(8, 'パスワードは8文字以上で入力してください')
      .max(100, 'パスワードは100文字以内で入力してください')
      .optional()
      .or(z.literal('')),
  });

// 営業担当者検索クエリのスキーマ
export const salesPersonQuerySchema = z.object({
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  role: z.enum(['member', 'manager', 'admin']).optional(),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateSalesPersonInput = z.infer<typeof createSalesPersonSchema>;
export type UpdateSalesPersonInput = z.infer<typeof updateSalesPersonSchema>;
export type SalesPersonQuery = z.infer<typeof salesPersonQuerySchema>;
