'use client';

import { MessageSquare, Trash2, User } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Comment } from '@/hooks/useReport';

/**
 * 日時をフォーマットする（YYYY/MM/DD HH:MM形式）
 */
function formatDateTime(dateTimeString: string): string {
  const date = new Date(dateTimeString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

interface CommentListProps {
  comments: Comment[];
  currentUserId: number | undefined;
  onDeleteComment: (commentId: number) => Promise<void>;
  isDeleting: boolean;
}

/**
 * コメント一覧コンポーネント
 *
 * コメントの一覧表示と削除機能を提供
 */
export function CommentList({
  comments,
  currentUserId,
  onDeleteComment,
  isDeleting,
}: CommentListProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const handleDeleteClick = (commentId: number) => {
    setDeleteTargetId(commentId);
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId !== null) {
      await onDeleteComment(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteTargetId(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            コメント（{comments.length}件）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {comments.length === 0 ? (
            <p className="text-muted-foreground">コメントはありません</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const canDelete = currentUserId === comment.commenter.id;
                return (
                  <div
                    key={comment.id}
                    className="rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <span className="font-medium">{comment.commenter.name}</span>
                          <span className="ml-2 text-muted-foreground">
                            {formatDateTime(comment.created_at)}
                          </span>
                        </div>
                      </div>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeleteClick(comment.id)}
                          disabled={isDeleting}
                          aria-label="コメントを削除"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && handleCancelDelete()}
        title="コメントを削除"
        description="このコメントを削除してもよろしいですか？この操作は取り消せません。"
        confirmLabel="削除"
        cancelLabel="キャンセル"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        variant="destructive"
      />
    </>
  );
}
