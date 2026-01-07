'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingPage } from '@/components/common/Loading';
import { PageContainer } from '@/components/layout/PageContainer';
import { ReportForm } from '@/components/reports';
import { useRequireAuth } from '@/hooks/useAuth';
import { useReportDetail } from '@/hooks/useReport';

/**
 * 日報編集画面（SCR-003）
 *
 * 既存日報の編集を行う画面。
 * - 既存データの読み込み
 * - 報告日、訪問記録、Problem/Plan の編集
 * - 保存後は詳細画面へ遷移
 */
export default function EditReportPage() {
  const auth = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const reportId = params?.id ? parseInt(params.id, 10) : undefined;
  const { report, isLoading: reportLoading, error: reportError, fetchReport } = useReportDetail();

  // 日報データを取得
  useEffect(() => {
    if (auth.isAuthenticated && reportId && !isNaN(reportId)) {
      fetchReport(reportId);
    }
  }, [auth.isAuthenticated, reportId, fetchReport]);

  // 認証ローディング中
  if (auth.isLoading) {
    return <LoadingPage />;
  }

  // 未認証（リダイレクト処理中）
  if (!auth.isAuthenticated) {
    return <LoadingPage />;
  }

  // 日報データ読み込み中
  if (reportLoading) {
    return <LoadingPage />;
  }

  // エラー表示
  if (reportError) {
    return (
      <PageContainer title="日報編集" breadcrumbs={[{ label: '日報編集' }]}>
        <ErrorMessage message={reportError} className="mb-4" />
      </PageContainer>
    );
  }

  // 日報が見つからない
  if (!report) {
    return (
      <PageContainer title="日報編集" breadcrumbs={[{ label: '日報編集' }]}>
        <ErrorMessage message="日報が見つかりませんでした" className="mb-4" />
      </PageContainer>
    );
  }

  // 本人以外は編集不可
  if (auth.user && report.sales_person.id !== auth.user.id && auth.user.role !== 'admin') {
    return (
      <PageContainer title="日報編集" breadcrumbs={[{ label: '日報編集' }]}>
        <ErrorMessage message="この日報を編集する権限がありません" className="mb-4" />
      </PageContainer>
    );
  }

  /**
   * 保存成功時の処理
   */
  const handleSuccess = () => {
    router.push(`/reports/${reportId}`);
  };

  return (
    <PageContainer
      title="日報編集"
      breadcrumbs={[{ label: '日報詳細', href: `/reports/${reportId}` }, { label: '編集' }]}
    >
      <ReportForm mode="edit" initialData={report} onSuccess={handleSuccess} />
    </PageContainer>
  );
}
