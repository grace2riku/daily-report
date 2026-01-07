'use client';

import { Send } from 'lucide-react';
import { useState } from 'react';

import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingSpinner } from '@/components/common/Loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * コメント入力フォームコンポーネント
 *
 * 上長・管理者のみに表示されるコメント投稿フォーム
 */
export function CommentForm({ onSubmit, isLoading, error }: CommentFormProps) {
  const [content, setContent] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setValidationError('コメント内容を入力してください');
      return;
    }
    if (trimmedContent.length > 1000) {
      setValidationError('コメントは1000文字以内で入力してください');
      return;
    }

    setValidationError(null);

    try {
      await onSubmit(trimmedContent);
      setContent(''); // 成功時にフォームをクリア
    } catch {
      // エラーは親コンポーネントで処理される
    }
  };

  const displayError = validationError || error;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">コメントを投稿</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="コメントを入力..."
              rows={3}
              disabled={isLoading}
              aria-label="コメント内容"
              aria-invalid={!!displayError}
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">
              {content.length} / 1000文字
            </p>
          </div>

          {displayError && <ErrorMessage message={displayError} />}

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || !content.trim()}>
              {isLoading ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  投稿中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  コメント投稿
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
