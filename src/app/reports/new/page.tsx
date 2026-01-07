'use client';

import { LoadingPage } from '@/components/common/Loading';
import { PageContainer } from '@/components/layout/PageContainer';
import { ReportForm } from '@/components/reports';
import { useRequireAuth } from '@/hooks/useAuth';

/**
 * 日報作成画面（SCR-003）
 *
 * 新規日報の入力を行う画面。
 * - 報告日の入力
 * - 訪問記録の登録（複数可）
 * - Problem/Plan の入力
 * - 下書き保存または提出
 */
export default function NewReportPage() {
  const auth = useRequireAuth();

  // 認証ローディング中
  if (auth.isLoading) {
    return <LoadingPage />;
  }

  // 未認証（リダイレクト処理中）
  if (!auth.isAuthenticated) {
    return <LoadingPage />;
  }

  return (
    <PageContainer title="日報作成" breadcrumbs={[{ label: '日報作成' }]}>
      <ReportForm mode="create" />
    </PageContainer>
  );
}
