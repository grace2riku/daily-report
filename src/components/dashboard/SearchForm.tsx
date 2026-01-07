'use client';

import { Search } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import { DatePicker } from '@/components/form/DatePicker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserRole } from '@/types/auth';

export interface SalesPerson {
  id: number;
  name: string;
}

export interface SearchFormValues {
  startDate: Date | undefined;
  endDate: Date | undefined;
  salesPersonId: number | undefined;
}

interface SearchFormProps {
  values: SearchFormValues;
  onChange: (values: SearchFormValues) => void;
  onSearch: () => void;
  salesPersons?: SalesPerson[];
  currentUserId?: number;
  currentUserRole?: UserRole;
  isLoading?: boolean;
}

/**
 * ダッシュボード用検索フォームコンポーネント
 *
 * 日報一覧の検索条件（期間、担当者）を入力するフォームを提供する。
 * 上長・管理者は担当者選択が可能、一般営業は自分の日報のみ表示。
 */
export function SearchForm({
  values,
  onChange,
  onSearch,
  salesPersons = [],
  currentUserId,
  currentUserRole,
  isLoading = false,
}: SearchFormProps) {
  // 担当者選択を表示するかどうか（上長・管理者のみ）
  const canSelectSalesPerson = useMemo(() => {
    return currentUserRole === 'manager' || currentUserRole === 'admin';
  }, [currentUserRole]);

  const handleStartDateChange = useCallback(
    (date: Date | undefined) => {
      onChange({ ...values, startDate: date });
    },
    [onChange, values]
  );

  const handleEndDateChange = useCallback(
    (date: Date | undefined) => {
      onChange({ ...values, endDate: date });
    },
    [onChange, values]
  );

  const handleSalesPersonChange = useCallback(
    (value: string) => {
      const salesPersonId = value === 'all' ? undefined : Number(value);
      onChange({ ...values, salesPersonId });
    },
    [onChange, values]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearch();
    },
    [onSearch]
  );

  // 担当者選択の値を文字列に変換
  const salesPersonValue = useMemo(() => {
    if (values.salesPersonId === undefined) {
      return 'all';
    }
    return String(values.salesPersonId);
  }, [values.salesPersonId]);

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
        <div className="text-sm font-medium text-muted-foreground">検索条件</div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          {/* 期間 */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="start-date" className="text-sm">
                期間
              </Label>
              <DatePicker
                id="start-date"
                value={values.startDate}
                onChange={handleStartDateChange}
                placeholder="開始日"
                maxDate={values.endDate}
                disabled={isLoading}
              />
            </div>
            <span className="hidden text-muted-foreground sm:block sm:pb-2">〜</span>
            <div className="space-y-1.5">
              <Label htmlFor="end-date" className="sr-only">
                終了日
              </Label>
              <DatePicker
                id="end-date"
                value={values.endDate}
                onChange={handleEndDateChange}
                placeholder="終了日"
                minDate={values.startDate}
                maxDate={new Date()}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* 担当者選択（上長・管理者のみ表示） */}
          {canSelectSalesPerson && (
            <div className="space-y-1.5">
              <Label htmlFor="sales-person" className="text-sm">
                担当者
              </Label>
              <Select
                value={salesPersonValue}
                onValueChange={handleSalesPersonChange}
                disabled={isLoading}
              >
                <SelectTrigger id="sales-person" className="w-full sm:w-[180px]">
                  <SelectValue placeholder="担当者を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全員</SelectItem>
                  {salesPersons.map((person) => (
                    <SelectItem key={person.id} value={String(person.id)}>
                      {person.name}
                      {person.id === currentUserId && '（自分）'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 検索ボタン */}
          <Button type="submit" disabled={isLoading} className="sm:ml-auto">
            <Search className="h-4 w-4" aria-hidden="true" />
            検索
          </Button>
        </div>
      </div>
    </form>
  );
}
