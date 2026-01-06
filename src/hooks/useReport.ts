'use client';

import { useState, useCallback, useEffect } from 'react';

import type {
  ApiSuccessResponse,
  ApiPaginatedResponse,
  ApiErrorResponse,
  Pagination,
} from '@/types/api';

/**
 * 日報ステータス
 */
export type ReportStatus = 'draft' | 'submitted' | 'reviewed';

/**
 * ページネーション情報（UI用キャメルケース）
 */
export interface PaginationInfo {
  currentPage: number;
  perPage: number;
  totalPages: number;
  totalCount: number;
}

/**
 * 日報サマリー（一覧用）
 */
export interface ReportSummary {
  id: number;
  report_date: string;
  sales_person: { id: number; name: string };
  visit_count: number;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

/**
 * コメント情報
 */
export interface Comment {
  id: number;
  commenter: { id: number; name: string };
  content: string;
  created_at: string;
}

/**
 * 訪問記録
 */
export interface VisitRecord {
  id: number;
  customer: { id: number; name: string };
  visit_time: string | null;
  content: string;
  sort_order: number;
}

/**
 * 日報詳細
 */
export interface ReportDetail extends ReportSummary {
  problem: string | null;
  plan: string | null;
  visit_records: VisitRecord[];
  comments: Comment[];
}

/**
 * 日報一覧取得パラメータ
 */
export interface ReportListParams {
  start_date?: string;
  end_date?: string;
  sales_person_id?: number;
  status?: ReportStatus;
  page?: number;
  per_page?: number;
}

/**
 * 日報作成時の訪問記録入力
 */
export interface CreateVisitRecordInput {
  customer_id: number;
  visit_time?: string;
  content: string;
}

/**
 * 日報更新時の訪問記録入力
 */
export interface UpdateVisitRecordInput extends CreateVisitRecordInput {
  id?: number; // 既存レコードの場合はIDを指定
}

/**
 * 日報作成入力
 */
export interface CreateReportInput {
  report_date: string;
  problem?: string;
  plan?: string;
  status: 'draft' | 'submitted';
  visit_records: CreateVisitRecordInput[];
}

/**
 * 日報更新入力
 */
export interface UpdateReportInput {
  report_date: string;
  problem?: string;
  plan?: string;
  status: 'draft' | 'submitted';
  visit_records: UpdateVisitRecordInput[];
}

/**
 * 日報一覧取得フックの戻り値
 */
export interface UseReportListReturn {
  reports: ReportSummary[];
  pagination: PaginationInfo;
  isLoading: boolean;
  error: string | null;
  fetchReports: (params?: ReportListParams) => Promise<void>;
}

/**
 * 日報詳細取得フックの戻り値
 */
export interface UseReportDetailReturn {
  report: ReportDetail | null;
  isLoading: boolean;
  error: string | null;
  fetchReport: (id: number) => Promise<void>;
}

/**
 * 日報ミューテーションフックの戻り値
 */
export interface UseReportMutationReturn {
  isLoading: boolean;
  error: string | null;
  createReport: (data: CreateReportInput) => Promise<ReportDetail>;
  updateReport: (id: number, data: UpdateReportInput) => Promise<ReportDetail>;
  deleteReport: (id: number) => Promise<void>;
}

/**
 * APIからのページネーション情報をUI用に変換
 */
function convertPagination(pagination: Pagination): PaginationInfo {
  return {
    currentPage: pagination.current_page,
    perPage: pagination.per_page,
    totalPages: pagination.total_pages,
    totalCount: pagination.total_count,
  };
}

/**
 * デフォルトのページネーション情報
 */
const DEFAULT_PAGINATION: PaginationInfo = {
  currentPage: 1,
  perPage: 20,
  totalPages: 0,
  totalCount: 0,
};

/**
 * 日報一覧を取得するカスタムフック
 *
 * @returns 日報一覧、ページネーション、ローディング状態、エラー、取得関数
 *
 * @example
 * ```tsx
 * function ReportListPage() {
 *   const { reports, pagination, isLoading, error, fetchReports } = useReportList();
 *
 *   useEffect(() => {
 *     fetchReports({ start_date: '2025-01-01', end_date: '2025-01-31' });
 *   }, [fetchReports]);
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error message={error} />;
 *
 *   return <ReportTable reports={reports} pagination={pagination} />;
 * }
 * ```
 */
export function useReportList(): UseReportListReturn {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>(DEFAULT_PAGINATION);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async (params?: ReportListParams) => {
    setIsLoading(true);
    setError(null);

    try {
      // クエリパラメータを構築
      const searchParams = new URLSearchParams();
      if (params?.start_date) searchParams.set('start_date', params.start_date);
      if (params?.end_date) searchParams.set('end_date', params.end_date);
      if (params?.sales_person_id !== undefined) {
        searchParams.set('sales_person_id', String(params.sales_person_id));
      }
      if (params?.status) searchParams.set('status', params.status);
      if (params?.page !== undefined) searchParams.set('page', String(params.page));
      if (params?.per_page !== undefined) searchParams.set('per_page', String(params.per_page));

      const queryString = searchParams.toString();
      const url = queryString ? `/api/v1/reports?${queryString}` : '/api/v1/reports';

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      const data = (await response.json()) as
        | ApiPaginatedResponse<ReportSummary>
        | ApiErrorResponse;

      if (!response.ok || !data.success) {
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message);
      }

      const successData = data as ApiPaginatedResponse<ReportSummary>;
      setReports(successData.data);
      setPagination(convertPagination(successData.pagination));
    } catch (err) {
      const message = err instanceof Error ? err.message : '日報一覧の取得に失敗しました';
      setError(message);
      setReports([]);
      setPagination(DEFAULT_PAGINATION);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    reports,
    pagination,
    isLoading,
    error,
    fetchReports,
  };
}

/**
 * 日報詳細を取得するカスタムフック
 *
 * @param initialId 初期読み込み時の日報ID（オプション）
 * @returns 日報詳細、ローディング状態、エラー、取得関数
 *
 * @example
 * ```tsx
 * function ReportDetailPage({ id }: { id: number }) {
 *   const { report, isLoading, error, fetchReport } = useReportDetail(id);
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error message={error} />;
 *   if (!report) return <NotFound />;
 *
 *   return <ReportView report={report} />;
 * }
 * ```
 */
export function useReportDetail(initialId?: number): UseReportDetailReturn {
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/reports/${id}`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = (await response.json()) as ApiSuccessResponse<ReportDetail> | ApiErrorResponse;

      if (!response.ok || !data.success) {
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message);
      }

      const successData = data as ApiSuccessResponse<ReportDetail>;
      setReport(successData.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '日報の取得に失敗しました';
      setError(message);
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初期IDが指定されている場合は自動的に取得
  useEffect(() => {
    if (initialId !== undefined) {
      fetchReport(initialId);
    }
  }, [initialId, fetchReport]);

  return {
    report,
    isLoading,
    error,
    fetchReport,
  };
}

/**
 * 日報の作成・更新・削除を行うカスタムフック
 *
 * @returns ローディング状態、エラー、作成・更新・削除関数
 *
 * @example
 * ```tsx
 * function ReportForm() {
 *   const { isLoading, error, createReport, updateReport } = useReportMutation();
 *
 *   const handleSubmit = async (data: CreateReportInput) => {
 *     try {
 *       const report = await createReport(data);
 *       console.log('Created:', report);
 *     } catch (err) {
 *       console.error('Failed:', err);
 *     }
 *   };
 *
 *   return <Form onSubmit={handleSubmit} isLoading={isLoading} error={error} />;
 * }
 * ```
 */
export function useReportMutation(): UseReportMutationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 日報を作成する
   */
  const createReport = useCallback(async (data: CreateReportInput): Promise<ReportDetail> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = (await response.json()) as ApiSuccessResponse<ReportDetail> | ApiErrorResponse;

      if (!response.ok || !result.success) {
        const errorData = result as ApiErrorResponse;
        throw new Error(errorData.error.message);
      }

      const successData = result as ApiSuccessResponse<ReportDetail>;
      return successData.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '日報の作成に失敗しました';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 日報を更新する
   */
  const updateReport = useCallback(
    async (id: number, data: UpdateReportInput): Promise<ReportDetail> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/reports/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        });

        const result = (await response.json()) as
          | ApiSuccessResponse<ReportDetail>
          | ApiErrorResponse;

        if (!response.ok || !result.success) {
          const errorData = result as ApiErrorResponse;
          throw new Error(errorData.error.message);
        }

        const successData = result as ApiSuccessResponse<ReportDetail>;
        return successData.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : '日報の更新に失敗しました';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 日報を削除する
   */
  const deleteReport = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/reports/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = (await response.json()) as
        | ApiSuccessResponse<{ message: string }>
        | ApiErrorResponse;

      if (!response.ok || !result.success) {
        const errorData = result as ApiErrorResponse;
        throw new Error(errorData.error.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '日報の削除に失敗しました';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    createReport,
    updateReport,
    deleteReport,
  };
}
