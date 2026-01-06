'use client';

import { Eye } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import { DataTable, type Column } from '@/components/data/DataTable';
import { Button } from '@/components/ui/button';
import type { ReportSummary, PaginationInfo } from '@/hooks/useReport';
import { formatDateSlash } from '@/lib/utils/date';

interface ReportTableProps {
  reports: ReportSummary[];
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

/**
 * 日報一覧テーブルコンポーネント
 *
 * 日報の一覧をテーブル形式で表示し、詳細画面への遷移を提供する。
 */
export function ReportTable({
  reports,
  pagination,
  onPageChange,
  isLoading = false,
}: ReportTableProps) {
  const columns: Column<ReportSummary>[] = useMemo(
    () => [
      {
        key: 'report_date',
        header: '日付',
        className: 'w-[120px]',
        render: (report) => formatDateSlash(report.report_date) || '-',
      },
      {
        key: 'sales_person',
        header: '担当者',
        className: 'w-[120px]',
        render: (report) => report.sales_person.name,
      },
      {
        key: 'visit_count',
        header: '訪問件数',
        className: 'w-[100px] text-center',
        render: (report) => `${report.visit_count}件`,
      },
      {
        key: 'status',
        header: 'ステータス',
        className: 'w-[120px]',
        render: (report) => <StatusBadge status={report.status} />,
      },
      {
        key: 'actions',
        header: '操作',
        className: 'w-[80px]',
        render: (report) => (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/reports/${report.id}`}>
              <Eye className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only sm:ml-1">詳細</span>
            </Link>
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={reports}
      keyExtractor={(report) => report.id}
      pagination={{
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        totalCount: pagination.totalCount,
        perPage: pagination.perPage,
        onPageChange,
      }}
      isLoading={isLoading}
      emptyMessage="該当する日報がありません"
    />
  );
}
