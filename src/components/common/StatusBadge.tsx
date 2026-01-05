import { cn } from '@/lib/utils';

type ReportStatus = 'draft' | 'submitted' | 'reviewed';

interface StatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

const statusConfig: Record<ReportStatus, { label: string; className: string }> = {
  draft: {
    label: '下書き',
    className:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  },
  submitted: {
    label: '提出済',
    className:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-800',
  },
  reviewed: {
    label: 'レビュー済',
    className:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
