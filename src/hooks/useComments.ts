'use client';

import { useState, useCallback } from 'react';

import type { Comment } from '@/hooks/useReport';
import type { ApiSuccessResponse, ApiErrorResponse } from '@/types/api';

/**
 * コメント投稿入力
 */
export interface CreateCommentInput {
  content: string;
}

/**
 * コメント更新入力
 */
export interface UpdateCommentInput {
  content: string;
}

/**
 * コメントミューテーションフックの戻り値
 */
export interface UseCommentMutationReturn {
  isLoading: boolean;
  error: string | null;
  createComment: (reportId: number, data: CreateCommentInput) => Promise<Comment>;
  updateComment: (commentId: number, data: UpdateCommentInput) => Promise<Comment>;
  deleteComment: (commentId: number) => Promise<void>;
  clearError: () => void;
}

/**
 * コメントの投稿・更新・削除を行うカスタムフック
 *
 * @returns ローディング状態、エラー、投稿・更新・削除関数
 *
 * @example
 * ```tsx
 * function CommentSection({ reportId }: { reportId: number }) {
 *   const { isLoading, error, createComment, deleteComment } = useCommentMutation();
 *
 *   const handleSubmit = async (content: string) => {
 *     try {
 *       await createComment(reportId, { content });
 *       // 成功時の処理
 *     } catch (err) {
 *       // エラー処理
 *     }
 *   };
 *
 *   return <CommentForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />;
 * }
 * ```
 */
export function useCommentMutation(): UseCommentMutationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * エラーをクリアする
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * コメントを投稿する
   */
  const createComment = useCallback(
    async (reportId: number, data: CreateCommentInput): Promise<Comment> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/reports/${reportId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        });

        const result = (await response.json()) as ApiSuccessResponse<Comment> | ApiErrorResponse;

        if (!response.ok || !result.success) {
          const errorData = result as ApiErrorResponse;
          throw new Error(errorData.error.message);
        }

        const successData = result as ApiSuccessResponse<Comment>;
        return successData.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'コメントの投稿に失敗しました';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * コメントを更新する
   */
  const updateComment = useCallback(
    async (commentId: number, data: UpdateCommentInput): Promise<Comment> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/comments/${commentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        });

        const result = (await response.json()) as ApiSuccessResponse<Comment> | ApiErrorResponse;

        if (!response.ok || !result.success) {
          const errorData = result as ApiErrorResponse;
          throw new Error(errorData.error.message);
        }

        const successData = result as ApiSuccessResponse<Comment>;
        return successData.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'コメントの更新に失敗しました';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * コメントを削除する
   */
  const deleteComment = useCallback(async (commentId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = (await response.json()) as
        | ApiSuccessResponse<{ message: string }>
        | ApiErrorResponse;

      if (!response.ok || !result.success) {
        const errorData = result as ApiErrorResponse;
        throw new Error(errorData.error.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'コメントの削除に失敗しました';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    createComment,
    updateComment,
    deleteComment,
    clearError,
  };
}
