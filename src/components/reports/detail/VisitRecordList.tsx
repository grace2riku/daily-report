'use client';

import { Clock, Building } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VisitRecord } from '@/hooks/useReport';

interface VisitRecordListProps {
  visitRecords: VisitRecord[];
}

/**
 * 訪問記録一覧コンポーネント
 *
 * 訪問時刻、顧客名、訪問内容をカード形式で表示
 */
export function VisitRecordList({ visitRecords }: VisitRecordListProps) {
  if (visitRecords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">訪問記録</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">訪問記録はありません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">訪問記録（{visitRecords.length}件）</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {visitRecords
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((record) => (
            <div
              key={record.id}
              className="rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
            >
              <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
                {record.visit_time && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{record.visit_time}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 font-medium">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{record.customer.name}</span>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{record.content}</p>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
