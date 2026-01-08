import { z } from 'zod';

import { paginationSchema } from './common';

// 電話番号のバリデーション（日本の電話番号形式）
const phoneRegex = /^0\d{1,4}-?\d{1,4}-?\d{3,4}$/;

// 顧客コードスキーマ（再利用可能）
export const customerCodeSchema = z
  .string()
  .min(1, '顧客コードを入力してください')
  .max(20, '顧客コードは20文字以内で入力してください')
  .regex(/^[a-zA-Z0-9]+$/, '顧客コードは半角英数字で入力してください');

// 電話番号スキーマ（再利用可能）
export const phoneSchema = z
  .string()
  .max(20, '電話番号は20文字以内で入力してください')
  .refine((val) => !val || phoneRegex.test(val), '有効な電話番号を入力してください')
  .optional()
  .or(z.literal(''));

// 顧客作成リクエストのスキーマ
export const createCustomerSchema = z.object({
  customerCode: customerCodeSchema,
  name: z
    .string()
    .min(1, '顧客名を入力してください')
    .max(200, '顧客名は200文字以内で入力してください'),
  address: z.string().max(500, '住所は500文字以内で入力してください').optional().or(z.literal('')),
  phone: phoneSchema,
  isActive: z.boolean().default(true),
});

// 顧客更新リクエストのスキーマ
export const updateCustomerSchema = createCustomerSchema.partial().omit({ customerCode: true });

// 顧客検索クエリのスキーマ
export const customerQuerySchema = z
  .object({
    keyword: z
      .string()
      .max(200, 'キーワードは200文字以内で入力してください')
      .optional(),
    isActive: z
      .string()
      .transform((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return undefined;
      })
      .optional(),
  })
  .merge(paginationSchema);

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerQuery = z.infer<typeof customerQuerySchema>;
