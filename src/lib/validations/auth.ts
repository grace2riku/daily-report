import { z } from 'zod';

// ログインリクエストのスキーマ
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください')
    .max(255, 'メールアドレスは255文字以内で入力してください'),
  password: z
    .string()
    .min(1, 'パスワードを入力してください')
    .max(100, 'パスワードは100文字以内で入力してください'),
});

export type LoginInput = z.infer<typeof loginSchema>;
