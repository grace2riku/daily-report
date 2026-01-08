'use client';

import { SearchInput } from '@/components/form/SearchInput';

interface CustomerSearchFormProps {
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  onSearch: (keyword: string) => void;
  isLoading?: boolean;
}

/**
 * 顧客検索フォーム
 */
export function CustomerSearchForm({
  keyword,
  onKeywordChange,
  onSearch,
  isLoading = false,
}: CustomerSearchFormProps) {
  return (
    <div className="mb-6 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="customer-search" className="mb-2 block text-sm font-medium">
            検索
          </label>
          <SearchInput
            id="customer-search"
            value={keyword}
            onChange={onKeywordChange}
            onSearch={onSearch}
            placeholder="顧客名・顧客コードで検索..."
            showSearchButton
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
