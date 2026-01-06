import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  useReportList,
  useReportDetail,
  useReportMutation,
  type ReportSummary,
  type ReportDetail,
  type CreateReportInput,
  type UpdateReportInput,
} from '../useReport';

// fetchのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// テストデータ
const mockReportSummary: ReportSummary = {
  id: 1,
  report_date: '2025-01-15',
  sales_person: { id: 1, name: '山田太郎' },
  visit_count: 3,
  status: 'submitted',
  created_at: '2025-01-15T18:00:00Z',
  updated_at: '2025-01-15T18:30:00Z',
};

const mockReportDetail: ReportDetail = {
  ...mockReportSummary,
  problem: 'A社への提案価格について上長に相談したい。',
  plan: 'B社へ見積もり提出\nC社アポイント調整',
  visit_records: [
    {
      id: 1,
      customer: { id: 1, name: '株式会社ABC' },
      visit_time: '10:00',
      content: '新製品の提案を実施。',
      sort_order: 0,
    },
  ],
  comments: [
    {
      id: 1,
      commenter: { id: 3, name: '佐藤次郎' },
      content: 'A社の件、明日MTGで相談しましょう。',
      created_at: '2025-01-15T18:30:00Z',
    },
  ],
};

const mockPagination = {
  current_page: 1,
  per_page: 20,
  total_pages: 1,
  total_count: 1,
};

describe('useReportList', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // UT-011-01: 日報一覧取得
  describe('UT-011-01: 日報一覧取得', () => {
    it('日報一覧を正常に取得できる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockReportSummary],
          pagination: mockPagination,
        }),
      });

      const { result } = renderHook(() => useReportList());

      // 初期状態の確認
      expect(result.current.reports).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // 日報一覧を取得
      await act(async () => {
        await result.current.fetchReports();
      });

      // 取得後の状態確認
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.reports).toHaveLength(1);
      expect(result.current.reports[0]).toEqual(mockReportSummary);
      expect(result.current.pagination.currentPage).toBe(1);
      expect(result.current.pagination.totalCount).toBe(1);
      expect(result.current.error).toBeNull();
    });

    it('検索パラメータを正しく送信できる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockReportSummary],
          pagination: mockPagination,
        }),
      });

      const { result } = renderHook(() => useReportList());

      await act(async () => {
        await result.current.fetchReports({
          start_date: '2025-01-01',
          end_date: '2025-01-31',
          sales_person_id: 1,
          status: 'submitted',
          page: 1,
          per_page: 10,
        });
      });

      // fetch呼び出しの確認
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('start_date=2025-01-01'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
      expect(mockFetch.mock.calls[0][0]).toContain('end_date=2025-01-31');
      expect(mockFetch.mock.calls[0][0]).toContain('sales_person_id=1');
      expect(mockFetch.mock.calls[0][0]).toContain('status=submitted');
    });

    it('エラー時にエラーメッセージが設定される', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です',
          },
        }),
      });

      const { result } = renderHook(() => useReportList());

      await act(async () => {
        await result.current.fetchReports();
      });

      expect(result.current.error).toBe('認証が必要です');
      expect(result.current.reports).toEqual([]);
    });

    it('ネットワークエラー時に適切なエラーメッセージが設定される', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useReportList());

      await act(async () => {
        await result.current.fetchReports();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.reports).toEqual([]);
    });

    it('ローディング状態が正しく管理される', async () => {
      let resolvePromise: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockImplementationOnce(() => fetchPromise);

      const { result } = renderHook(() => useReportList());

      // fetchを開始
      act(() => {
        result.current.fetchReports();
      });

      // ローディング中の確認
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // fetchを完了
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({
            success: true,
            data: [mockReportSummary],
            pagination: mockPagination,
          }),
        });
      });

      // ローディング終了の確認
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});

describe('useReportDetail', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('日報詳細を正常に取得できる', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockReportDetail,
      }),
    });

    const { result } = renderHook(() => useReportDetail());

    // 初期状態の確認
    expect(result.current.report).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();

    // 日報詳細を取得
    await act(async () => {
      await result.current.fetchReport(1);
    });

    // 取得後の状態確認
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.report).toEqual(mockReportDetail);
    expect(result.current.report?.visit_records).toHaveLength(1);
    expect(result.current.report?.comments).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('initialIdが指定された場合は自動的に取得される', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockReportDetail,
      }),
    });

    const { result } = renderHook(() => useReportDetail(1));

    await waitFor(() => {
      expect(result.current.report).toEqual(mockReportDetail);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/reports/1', expect.any(Object));
  });

  it('存在しない日報の場合はエラーが設定される', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '日報が見つかりません',
        },
      }),
    });

    const { result } = renderHook(() => useReportDetail());

    await act(async () => {
      await result.current.fetchReport(999);
    });

    expect(result.current.error).toBe('日報が見つかりません');
    expect(result.current.report).toBeNull();
  });

  it('権限エラーの場合は適切なエラーメッセージが設定される', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'この日報を閲覧する権限がありません',
        },
      }),
    });

    const { result } = renderHook(() => useReportDetail());

    await act(async () => {
      await result.current.fetchReport(1);
    });

    expect(result.current.error).toBe('この日報を閲覧する権限がありません');
  });
});

describe('useReportMutation', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // UT-011-02: 日報作成
  describe('UT-011-02: 日報作成', () => {
    it('日報を正常に作成できる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockReportDetail,
        }),
      });

      const { result } = renderHook(() => useReportMutation());

      const createData: CreateReportInput = {
        report_date: '2025-01-15',
        problem: 'A社への提案価格について上長に相談したい。',
        plan: 'B社へ見積もり提出',
        status: 'submitted',
        visit_records: [
          {
            customer_id: 1,
            visit_time: '10:00',
            content: '新製品の提案を実施。',
          },
        ],
      };

      let createdReport: ReportDetail | undefined;
      await act(async () => {
        createdReport = await result.current.createReport(createData);
      });

      expect(createdReport).toEqual(mockReportDetail);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/reports',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(createData),
        })
      );
    });

    it('作成エラー時にエラーがスローされる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'この日付の日報は既に存在します',
          },
        }),
      });

      const { result } = renderHook(() => useReportMutation());

      const createData: CreateReportInput = {
        report_date: '2025-01-15',
        status: 'draft',
        visit_records: [
          {
            customer_id: 1,
            content: 'テスト内容',
          },
        ],
      };

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.createReport(createData);
        } catch (e) {
          thrownError = e as Error;
        }
      });

      expect(thrownError).not.toBeNull();
      expect(thrownError!.message).toBe('この日付の日報は既に存在します');

      await waitFor(() => {
        expect(result.current.error).toBe('この日付の日報は既に存在します');
      });
    });

    it('バリデーションエラー時に適切なエラーが設定される', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '訪問記録を1件以上登録してください',
          },
        }),
      });

      const { result } = renderHook(() => useReportMutation());

      const createData: CreateReportInput = {
        report_date: '2025-01-15',
        status: 'draft',
        visit_records: [],
      };

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.createReport(createData);
        } catch (e) {
          thrownError = e as Error;
        }
      });

      expect(thrownError).not.toBeNull();
      expect(thrownError!.message).toBe('訪問記録を1件以上登録してください');

      await waitFor(() => {
        expect(result.current.error).toBe('訪問記録を1件以上登録してください');
      });
    });
  });

  // UT-011-03: 日報更新
  describe('UT-011-03: 日報更新', () => {
    it('日報を正常に更新できる', async () => {
      const updatedReport = {
        ...mockReportDetail,
        problem: '更新された課題',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: updatedReport,
        }),
      });

      const { result } = renderHook(() => useReportMutation());

      const updateData: UpdateReportInput = {
        report_date: '2025-01-15',
        problem: '更新された課題',
        plan: 'B社へ見積もり提出',
        status: 'submitted',
        visit_records: [
          {
            id: 1,
            customer_id: 1,
            visit_time: '10:00',
            content: '新製品の提案を実施。（更新）',
          },
        ],
      };

      let result_report: ReportDetail | undefined;
      await act(async () => {
        result_report = await result.current.updateReport(1, updateData);
      });

      expect(result_report).toEqual(updatedReport);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/reports/1',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updateData),
        })
      );
    });

    it('他人の日報を更新しようとするとエラーになる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'この日報を編集する権限がありません',
          },
        }),
      });

      const { result } = renderHook(() => useReportMutation());

      const updateData: UpdateReportInput = {
        report_date: '2025-01-15',
        status: 'submitted',
        visit_records: [],
      };

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.updateReport(1, updateData);
        } catch (e) {
          thrownError = e as Error;
        }
      });

      expect(thrownError).not.toBeNull();
      expect(thrownError!.message).toBe('この日報を編集する権限がありません');

      await waitFor(() => {
        expect(result.current.error).toBe('この日報を編集する権限がありません');
      });
    });

    it('存在しない日報の更新はエラーになる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '日報が見つかりません',
          },
        }),
      });

      const { result } = renderHook(() => useReportMutation());

      const updateData: UpdateReportInput = {
        report_date: '2025-01-15',
        status: 'submitted',
        visit_records: [],
      };

      await expect(
        act(async () => {
          await result.current.updateReport(999, updateData);
        })
      ).rejects.toThrow('日報が見つかりません');
    });
  });

  describe('deleteReport', () => {
    it('日報を正常に削除できる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { message: '日報を削除しました' },
        }),
      });

      const { result } = renderHook(() => useReportMutation());

      await act(async () => {
        await result.current.deleteReport(1);
      });

      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/reports/1',
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include',
        })
      );
    });

    it('他人の日報を削除しようとするとエラーになる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'この日報を削除する権限がありません',
          },
        }),
      });

      const { result } = renderHook(() => useReportMutation());

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.deleteReport(1);
        } catch (e) {
          thrownError = e as Error;
        }
      });

      expect(thrownError).not.toBeNull();
      expect(thrownError!.message).toBe('この日報を削除する権限がありません');

      await waitFor(() => {
        expect(result.current.error).toBe('この日報を削除する権限がありません');
      });
    });
  });

  describe('ローディング状態', () => {
    it('createReport実行中にisLoadingがtrueになる', async () => {
      let resolvePromise: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockImplementationOnce(() => fetchPromise);

      const { result } = renderHook(() => useReportMutation());

      expect(result.current.isLoading).toBe(false);

      const createData: CreateReportInput = {
        report_date: '2025-01-15',
        status: 'draft',
        visit_records: [{ customer_id: 1, content: 'テスト' }],
      };

      // createReportを開始（エラーをキャッチ）
      act(() => {
        result.current.createReport(createData).catch(() => {});
      });

      // ローディング中の確認
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // fetchを完了
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({
            success: true,
            data: mockReportDetail,
          }),
        });
      });

      // ローディング終了の確認
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('updateReport実行中にisLoadingがtrueになる', async () => {
      let resolvePromise: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockImplementationOnce(() => fetchPromise);

      const { result } = renderHook(() => useReportMutation());

      const updateData: UpdateReportInput = {
        report_date: '2025-01-15',
        status: 'submitted',
        visit_records: [],
      };

      // updateReportを開始（エラーをキャッチ）
      act(() => {
        result.current.updateReport(1, updateData).catch(() => {});
      });

      // ローディング中の確認
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // fetchを完了
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({
            success: true,
            data: mockReportDetail,
          }),
        });
      });

      // ローディング終了の確認
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('deleteReport実行中にisLoadingがtrueになる', async () => {
      let resolvePromise: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockImplementationOnce(() => fetchPromise);

      const { result } = renderHook(() => useReportMutation());

      // deleteReportを開始（エラーをキャッチ）
      act(() => {
        result.current.deleteReport(1).catch(() => {});
      });

      // ローディング中の確認
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // fetchを完了
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({
            success: true,
            data: { message: '日報を削除しました' },
          }),
        });
      });

      // ローディング終了の確認
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
