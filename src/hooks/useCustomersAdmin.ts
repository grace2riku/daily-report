/**
 * 顧客管理用カスタムフック
 *
 * 顧客マスタ画面でのCRUD操作を提供する
 */

import { useCallback, useState } from 'react';

import type { Pagination } from '@/types/api';
import type { Customer, CreateCustomerRequest, UpdateCustomerRequest } from '@/types/customer';

interface FetchCustomersParams {
  page?: number;
  per_page?: number;
  is_active?: boolean;
  keyword?: string;
}

interface UseCustomersAdminResult {
  customers: Customer[];
  pagination: {
    currentPage: number;
    perPage: number;
    totalPages: number;
    totalCount: number;
  } | null;
  isLoading: boolean;
  error: string | null;
  fetchCustomers: (params?: FetchCustomersParams) => Promise<void>;
  createCustomer: (data: CreateCustomerRequest) => Promise<{ success: boolean; error?: string }>;
  updateCustomer: (
    id: number,
    data: UpdateCustomerRequest
  ) => Promise<{ success: boolean; error?: string }>;
  deleteCustomer: (id: number) => Promise<{ success: boolean; error?: string }>;
}

/**
 * 顧客管理用カスタムフック
 */
export function useCustomersAdmin(): UseCustomersAdminResult {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<{
    currentPage: number;
    perPage: number;
    totalPages: number;
    totalCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 顧客一覧を取得
   */
  const fetchCustomers = useCallback(async (params?: FetchCustomersParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
      if (params?.is_active !== undefined)
        searchParams.append('is_active', params.is_active.toString());
      if (params?.keyword) searchParams.append('keyword', params.keyword);

      const queryString = searchParams.toString();
      const url = `/api/v1/customers${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        setCustomers(result.data);
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
        setError(result.error?.message || '顧客一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setError('顧客一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 顧客を新規作成
   */
  const createCustomer = useCallback(
    async (data: CreateCustomerRequest): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch('/api/v1/customers', {
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
        console.error('Failed to create customer:', err);
        return { success: false, error: '登録に失敗しました' };
      }
    },
    []
  );

  /**
   * 顧客を更新
   */
  const updateCustomer = useCallback(
    async (
      id: number,
      data: UpdateCustomerRequest
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch(`/api/v1/customers/${id}`, {
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
        console.error('Failed to update customer:', err);
        return { success: false, error: '更新に失敗しました' };
      }
    },
    []
  );

  /**
   * 顧客を削除（論理削除）
   */
  const deleteCustomer = useCallback(
    async (id: number): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch(`/api/v1/customers/${id}`, {
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
        console.error('Failed to delete customer:', err);
        return { success: false, error: '削除に失敗しました' };
      }
    },
    []
  );

  return {
    customers,
    pagination,
    isLoading,
    error,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
