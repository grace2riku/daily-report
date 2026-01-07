/**
 * 顧客一覧取得カスタムフック
 */

import { useCallback, useEffect, useState } from 'react';

export interface CustomerItem {
  id: number;
  customer_code: string;
  name: string;
}

interface UseCustomersResult {
  customers: CustomerItem[];
  isLoading: boolean;
  error: string | null;
  fetchCustomers: () => Promise<void>;
}

/**
 * 顧客一覧を取得するカスタムフック
 *
 * @param autoFetch - 自動的にデータを取得するかどうか（デフォルト: false）
 * @returns 顧客一覧と取得関数
 *
 * @example
 * ```tsx
 * function CustomerSelectForm() {
 *   const { customers, isLoading, fetchCustomers } = useCustomers(true);
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <Select>
 *       {customers.map(c => (
 *         <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
 *       ))}
 *     </Select>
 *   );
 * }
 * ```
 */
export function useCustomers(autoFetch = false): UseCustomersResult {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/customers?is_active=true', {
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setCustomers(
            result.data.map((c: { id: number; customer_code: string; name: string }) => ({
              id: c.id,
              customer_code: c.customer_code,
              name: c.name,
            }))
          );
        }
      } else {
        setError('顧客一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setError('顧客一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchCustomers();
    }
  }, [autoFetch, fetchCustomers]);

  return {
    customers,
    isLoading,
    error,
    fetchCustomers,
  };
}
