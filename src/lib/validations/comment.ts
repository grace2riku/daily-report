import { z } from 'zod';

// コメント作成リクエストのスキーマ
export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'コメントを入力してください')
    .max(1000, 'コメントは1000文字以内で入力してください'),
});

// コメント更新リクエストのスキーマ
export const updateCommentSchema = createCommentSchema;

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
