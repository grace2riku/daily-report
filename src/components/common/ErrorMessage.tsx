import { AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md bg-destructive/10 p-4 text-destructive',
        className
      )}
    >
      <AlertCircle className="h-5 w-5 flex-shrink-0" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

interface ErrorPageProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

export function ErrorPage({
  title = 'エラーが発生しました',
  message = 'ページの読み込み中にエラーが発生しました。しばらくしてから再度お試しください。',
  action,
}: ErrorPageProps) {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="max-w-md text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
