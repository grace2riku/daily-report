/**
 * 営業担当者管理用カスタムフック
 *
 * 営業マスタ画面でのCRUD操作を提供する
 */

import { useCallback, useState } from 'react';

import type { Pagination } from '@/types/api';
import type {
  SalesPerson,
  CreateSalesPersonRequest,
  UpdateSalesPersonRequest,
} from '@/types/sales-person';

interface FetchSalesPersonsParams {
  page?: number;
  per_page?: number;
  is_active?: boolean;
  role?: string;
}

interface UseSalesPersonsAdminResult {
  salesPersons: SalesPerson[];
  pagination: {
    currentPage: number;
    perPage: number;
    totalPages: number;
    totalCount: number;
  } | null;
  isLoading: boolean;
  error: string | null;
  fetchSalesPersons: (params?: FetchSalesPersonsParams) => Promise<void>;
  createSalesPerson: (
    data: CreateSalesPersonRequest
  ) => Promise<{ success: boolean; error?: string }>;
  updateSalesPerson: (
    id: number,
    data: UpdateSalesPersonRequest
  ) => Promise<{ success: boolean; error?: string }>;
  deleteSalesPerson: (id: number) => Promise<{ success: boolean; error?: string }>;
}

/**
 * 営業担当者管理用カスタムフック
 */
export function useSalesPersonsAdmin(): UseSalesPersonsAdminResult {
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [pagination, setPagination] = useState<{
    currentPage: number;
    perPage: number;
    totalPages: number;
    totalCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 営業担当者一覧を取得
   */
  const fetchSalesPersons = useCallback(async (params?: FetchSalesPersonsParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
      if (params?.is_active !== undefined)
        searchParams.append('is_active', params.is_active.toString());
      if (params?.role) searchParams.append('role', params.role);

      const queryString = searchParams.toString();
      const url = `/api/v1/sales-persons${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        setSalesPersons(result.data);
        if (result.pagination) {
          const paginationData = result.pagination as Pagination;
          setPagination({
            currentPage: paginationData.current_page,
            perPage: paginationData.per_page,
            totalPages: paginationData.total_pages,
            totalCount: paginationData.total_count,
          });
        }
      } else {
        setError(result.error?.message || '営業担当者一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('Failed to fetch sales persons:', err);
      setError('営業担当者一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 営業担当者を新規作成
   */
  const createSalesPerson = useCallback(
    async (data: CreateSalesPersonRequest): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch('/api/v1/sales-persons', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.success) {
          return { success: true };
        } else {
          return { success: false, error: result.error?.message || '登録に失敗しました' };
        }
      } catch (err) {
        console.error('Failed to create sales person:', err);
        return { success: false, error: '登録に失敗しました' };
      }
    },
    []
  );

  /**
   * 営業担当者を更新
   */
  const updateSalesPerson = useCallback(
    async (
      id: number,
      data: UpdateSalesPersonRequest
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch(`/api/v1/sales-persons/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.success) {
          return { success: true };
        } else {
          return { success: false, error: result.error?.message || '更新に失敗しました' };
        }
      } catch (err) {
        console.error('Failed to update sales person:', err);
        return { success: false, error: '更新に失敗しました' };
      }
    },
    []
  );

  /**
   * 営業担当者を削除（論理削除）
   */
  const deleteSalesPerson = useCallback(
    async (id: number): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch(`/api/v1/sales-persons/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        const result = await response.json();

        if (result.success) {
          return { success: true };
        } else {
          return { success: false, error: result.error?.message || '削除に失敗しました' };
        }
      } catch (err) {
        console.error('Failed to delete sales person:', err);
        return { success: false, error: '削除に失敗しました' };
      }
    },
    []
  );

  return {
    salesPersons,
    pagination,
    isLoading,
    error,
    fetchSalesPersons,
    createSalesPerson,
    updateSalesPerson,
    deleteSalesPerson,
  };
}
