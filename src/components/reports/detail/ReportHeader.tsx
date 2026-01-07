'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';

import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ReportStatus } from '@/hooks/useReport';

/**
 * 曜日を取得する
 */
function getDayOfWeek(dateString: string): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const date = new Date(dateString);
  return days[date.getDay()];
}

/**
 * 日付をフォーマットする（YYYY年MM月DD日（曜日）形式）
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = getDayOfWeek(dateString);
  return `${year}年${month}月${day}日（${dayOfWeek}）`;
}

interface ReportHeaderProps {
  reportId: number;
  reportDate: string;
  salesPersonName: string;
  status: ReportStatus;
  canEdit: boolean;
}

/**
 * 日報詳細ヘッダーコンポーネント
 *
 * 報告日、担当者名、ステータス、編集ボタン（本人のみ）を表示
 */
export function ReportHeader({
  reportId,
  reportDate,
  salesPersonName,
  status,
  canEdit,
}: ReportHeaderProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">{formatDate(reportDate)}</h2>
              <StatusBadge status={status} />
            </div>
            <p className="text-muted-foreground">担当者: {salesPersonName}</p>
          </div>
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={`/reports/${reportId}/edit`}>
                <Pencil className="h-4 w-4" />
                編集
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
