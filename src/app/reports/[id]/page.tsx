'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useCallback } from 'react';

import { ErrorMessage, ErrorPage } from '@/components/common/ErrorMessage';
import { LoadingPage } from '@/components/common/Loading';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  ReportHeader,
  VisitRecordList,
  ProblemPlanSection,
  CommentList,
  CommentForm,
} from '@/components/reports/detail';
import { Button } from '@/components/ui/button';
import { useRequireAuth } from '@/hooks/useAuth';
import { useCommentMutation } from '@/hooks/useComments';
import { useReportDetail } from '@/hooks/useReport';

/**
 * 日報詳細画面（SCR-004）
 *
 * 日報の詳細表示およびコメント投稿を行う画面。
 * - 報告日、担当者、ステータスの表示
 * - 訪問記録一覧の表示
 * - Problem/Plan の表示
 * - コメント一覧の表示と投稿（上長・管理者のみ）
 * - 編集ボタン（本人のみ）
 */
export default function ReportDetailPage() {
  const auth = useRequireAuth();
  const params = useParams<{ id: string }>();

  const reportId = params?.id ? parseInt(params.id, 10) : undefined;
  const { report, isLoading: reportLoading, error: reportError, fetchReport } = useReportDetail();
  const {
    isLoading: commentLoading,
    error: commentError,
    createComment,
    deleteComment,
    clearError: clearCommentError,
  } = useCommentMutation();

  // 日報データを取得
  useEffect(() => {
    if (auth.isAuthenticated && reportId && !isNaN(reportId)) {
      fetchReport(reportId);
    }
  }, [auth.isAuthenticated, reportId, fetchReport]);

  /**
   * コメント投稿処理
   */
  const handleCommentSubmit = useCallback(
    async (content: string) => {
      if (!reportId) return;
      clearCommentError();
      await createComment(reportId, { content });
      // 日報を再取得してコメント一覧を更新
      await fetchReport(reportId);
    },
    [reportId, createComment, fetchReport, clearCommentError]
  );

  /**
   * コメント削除処理
   */
  const handleCommentDelete = useCallback(
    async (commentId: number) => {
      clearCommentError();
      await deleteComment(commentId);
      // 日報を再取得してコメント一覧を更新
      if (reportId) {
        await fetchReport(reportId);
      }
    },
    [deleteComment, fetchReport, reportId, clearCommentError]
  );

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

  // 403エラー（権限なし）の場合
  if (reportError && reportError.includes('権限')) {
    return (
      <ErrorPage
        title="アクセス権限がありません"
        message="この日報を閲覧する権限がありません。"
        action={
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              ダッシュボードに戻る
            </Link>
          </Button>
        }
      />
    );
  }

  // その他のエラー表示
  if (reportError) {
    return (
      <PageContainer
        title="日報詳細"
        breadcrumbs={[{ label: '日報詳細' }]}
        actions={
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              一覧に戻る
            </Link>
          </Button>
        }
      >
        <ErrorMessage message={reportError} className="mb-4" />
      </PageContainer>
    );
  }

  // 日報が見つからない
  if (!report) {
    return (
      <ErrorPage
        title="日報が見つかりません"
        message="指定された日報は存在しないか、削除されています。"
        action={
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              ダッシュボードに戻る
            </Link>
          </Button>
        }
      />
    );
  }

  // 権限チェック
  const currentUserId = auth.user?.id;
  const userRole = auth.user?.role;

  // 編集可能かどうか（本人のみ）
  const canEdit = currentUserId === report.sales_person.id;

  // コメント投稿可能かどうか（上長または管理者）
  const canComment = userRole === 'manager' || userRole === 'admin';

  return (
    <PageContainer
      title="日報詳細"
      breadcrumbs={[{ label: '日報詳細' }]}
      actions={
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            一覧に戻る
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* 日報ヘッダー */}
        <ReportHeader
          reportId={report.id}
          reportDate={report.report_date}
          salesPersonName={report.sales_person.name}
          status={report.status}
          canEdit={canEdit}
        />

        {/* 訪問記録一覧 */}
        <VisitRecordList visitRecords={report.visit_records} />

        {/* Problem/Plan セクション */}
        <ProblemPlanSection problem={report.problem} plan={report.plan} />

        {/* コメント一覧 */}
        <CommentList
          comments={report.comments}
          currentUserId={currentUserId}
          onDeleteComment={handleCommentDelete}
          isDeleting={commentLoading}
        />

        {/* コメント操作エラー（投稿・削除共通） */}
        {commentError && <ErrorMessage message={commentError} className="mt-4" />}

        {/* コメント投稿フォーム（上長・管理者のみ） */}
        {canComment && <CommentForm onSubmit={handleCommentSubmit} isLoading={commentLoading} />}
      </div>
    </PageContainer>
  );
}
