/**
 * 営業担当者一覧取得カスタムフック
 */

import { useCallback, useEffect, useState } from 'react';

export interface SalesPersonItem {
  id: number;
  name: string;
}

interface UseSalesPersonsResult {
  salesPersons: SalesPersonItem[];
  isLoading: boolean;
  error: string | null;
  fetchSalesPersons: () => Promise<void>;
}

/**
 * 営業担当者一覧を取得するカスタムフック
 *
 * @param autoFetch - 自動的にデータを取得するかどうか（デフォルト: false）
 * @returns 営業担当者一覧と取得関数
 */
export function useSalesPersons(autoFetch = false): UseSalesPersonsResult {
  const [salesPersons, setSalesPersons] = useState<SalesPersonItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSalesPersons = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/sales-persons', {
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setSalesPersons(
            result.data.map((p: { id: number; name: string }) => ({
              id: p.id,
              name: p.name,
            }))
          );
        }
      } else {
        setError('営業担当者一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('Failed to fetch sales persons:', err);
      setError('営業担当者一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchSalesPersons();
    }
  }, [autoFetch, fetchSalesPersons]);

  return {
    salesPersons,
    isLoading,
    error,
    fetchSalesPersons,
  };
}
