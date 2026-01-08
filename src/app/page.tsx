'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingPage } from '@/components/common/Loading';
import { ReportTable, SearchForm, type SearchFormValues } from '@/components/dashboard';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { useRequireAuth } from '@/hooks/useAuth';
import { useReportList, type ReportListParams } from '@/hooks/useReport';
import { useSalesPersons } from '@/hooks/useSalesPersons';
import { formatDateISO, getFirstDayOfMonth } from '@/lib/utils/date';

/**
 * ダッシュボード画面（SCR-002）
 *
 * 日報一覧の表示、検索、新規作成への導線を提供するメイン画面。
 * - 日報一覧をテーブル表示
 * - 期間・担当者による検索機能
 * - ページネーション
 * - 新規作成ボタンから日報作成画面への遷移
 */
export default function Dashboard() {
  const auth = useRequireAuth();
  const { reports, pagination, isLoading: isReportsLoading, error, fetchReports } = useReportList();
  const { salesPersons, fetchSalesPersons } = useSalesPersons();

  // 検索フォームの値
  const [searchValues, setSearchValues] = useState<SearchFormValues>(() => ({
    startDate: getFirstDayOfMonth(),
    endDate: new Date(),
    salesPersonId: undefined,
  }));

  // 初回読み込みフラグ（refを使用してeffect内でのsetStateを回避）
  const isInitializedRef = useRef(false);

  /**
   * 検索パラメータを構築
   */
  const buildSearchParams = useCallback(
    (page: number = 1): ReportListParams => {
      const params: ReportListParams = {
        page,
        per_page: 20,
      };

      if (searchValues.startDate) {
        params.start_date = formatDateISO(searchValues.startDate) || undefined;
      }

      if (searchValues.endDate) {
        params.end_date = formatDateISO(searchValues.endDate) || undefined;
      }

      // 担当者IDが指定されている場合のみセット
      if (searchValues.salesPersonId !== undefined) {
        params.sales_person_id = searchValues.salesPersonId;
      }

      return params;
    },
    [searchValues]
  );

  /**
   * 検索を実行
   */
  const handleSearch = useCallback(() => {
    const params = buildSearchParams(1);
    fetchReports(params);
  }, [buildSearchParams, fetchReports]);

  /**
   * ページ変更
   */
  const handlePageChange = useCallback(
    (page: number) => {
      const params = buildSearchParams(page);
      fetchReports(params);
    },
    [buildSearchParams, fetchReports]
  );

  // 認証完了後に初回データ取得
  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated && !isInitializedRef.current) {
      isInitializedRef.current = true;
      const params = buildSearchParams(1);
      fetchReports(params);
    }
  }, [auth.isLoading, auth.isAuthenticated, buildSearchParams, fetchReports]);

  // 上長・管理者の場合は営業担当者一覧を取得
  useEffect(() => {
    if (auth.isAuthenticated && (auth.user?.role === 'manager' || auth.user?.role === 'admin')) {
      fetchSalesPersons();
    }
  }, [auth.isAuthenticated, auth.user?.role, fetchSalesPersons]);

  // 認証ローディング中
  if (auth.isLoading) {
    return <LoadingPage />;
  }

  // 未認証（リダイレクト処理中）
  if (!auth.isAuthenticated) {
    return <LoadingPage />;
  }

  return (
    <>
      {/* ヘッダー */}
      <Header userName={auth.user?.name} userRole={auth.user?.role} onLogout={auth.logout} />

      <PageContainer
        title="日報一覧"
        actions={
          <Button asChild>
            <Link href="/reports/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              新規作成
            </Link>
          </Button>
        }
      >
        {/* 検索フォーム */}
        <div className="mb-6">
          <SearchForm
            values={searchValues}
            onChange={setSearchValues}
            onSearch={handleSearch}
            salesPersons={salesPersons}
            currentUserId={auth.user?.id}
            currentUserRole={auth.user?.role}
            isLoading={isReportsLoading}
          />
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* 日報一覧テーブル */}
        <ReportTable
          reports={reports}
          pagination={pagination}
          onPageChange={handlePageChange}
          isLoading={isReportsLoading}
        />
      </PageContainer>
    </>
  );
}
