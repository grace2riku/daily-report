'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled,
  className,
}: PaginationProps) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <nav
      role="navigation"
      aria-label="ページネーション"
      className={cn('flex items-center justify-center gap-2', className)}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || !canGoPrevious}
        aria-label="前のページへ"
      >
        <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
        前へ
      </Button>

      <span className="text-sm text-muted-foreground px-2">
        {currentPage} / {totalPages} ページ
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || !canGoNext}
        aria-label="次のページへ"
      >
        次へ
        <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
      </Button>
    </nav>
  );
}

interface PaginationInfoProps {
  currentPage: number;
  perPage: number;
  totalCount: number;
  className?: string;
}

export function PaginationInfo({
  currentPage,
  perPage,
  totalCount,
  className,
}: PaginationInfoProps) {
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, totalCount);

  if (totalCount === 0) {
    return <p className={cn('text-sm text-muted-foreground', className)}>データがありません</p>;
  }

  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {totalCount}件中 {start}〜{end}件を表示
    </p>
  );
}
