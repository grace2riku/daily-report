'use client';

import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CustomerItem } from '@/hooks/useCustomers';
import { cn } from '@/lib/utils';

interface CustomerSelectProps {
  customers: CustomerItem[];
  value?: number;
  onChange: (customerId: number) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  error?: boolean;
  className?: string;
  id?: string;
}

/**
 * 顧客選択ドロップダウンコンポーネント
 *
 * 顧客マスタから顧客を選択するためのセレクトボックス
 */
export function CustomerSelect({
  customers,
  value,
  onChange,
  placeholder = '顧客を選択',
  disabled = false,
  isLoading = false,
  error = false,
  className,
  id,
}: CustomerSelectProps) {
  const handleValueChange = (selectedValue: string) => {
    const customerId = parseInt(selectedValue, 10);
    if (!isNaN(customerId)) {
      onChange(customerId);
    }
  };

  return (
    <Select
      value={value && value > 0 ? value.toString() : undefined}
      onValueChange={handleValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger
        id={id}
        className={cn('w-full', error && 'border-destructive', className)}
        aria-invalid={error}
      >
        <SelectValue placeholder={isLoading ? '読み込み中...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {customers.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            {isLoading ? '読み込み中...' : '顧客データがありません'}
          </div>
        ) : (
          customers.map((customer) => (
            <SelectItem key={customer.id} value={customer.id.toString()}>
              {customer.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
