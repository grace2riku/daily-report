import { Badge } from '@/components/ui/badge';

type ReportStatus = 'draft' | 'submitted' | 'reviewed';

interface StatusBadgeProps {
  status: ReportStatus;
}

const statusConfig: Record<
  ReportStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  draft: { label: '下書き', variant: 'outline' },
  submitted: { label: '提出済', variant: 'secondary' },
  reviewed: { label: 'レビュー済', variant: 'default' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
