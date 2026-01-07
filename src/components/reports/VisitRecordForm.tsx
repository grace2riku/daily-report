'use client';

import { Trash2 } from 'lucide-react';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { CustomerItem } from '@/hooks/useCustomers';
import type { ReportFormValues } from '@/lib/validations/report-form';

import { CustomerSelect } from './CustomerSelect';

interface VisitRecordFormProps {
  index: number;
  customers: CustomerItem[];
  customersLoading: boolean;
  onRemove: () => void;
  canRemove: boolean;
}

/**
 * 訪問記録入力フォームコンポーネント
 *
 * 日報フォーム内で訪問記録を入力するためのカード形式コンポーネント
 * 動的に追加・削除が可能
 */
export function VisitRecordForm({
  index,
  customers,
  customersLoading,
  onRemove,
  canRemove,
}: VisitRecordFormProps) {
  const form = useFormContext<ReportFormValues>();

  return (
    <Card className="relative">
      <CardContent className="pt-6">
        {/* カード番号と削除ボタン */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onRemove}
              aria-label={`訪問記録${index + 1}を削除`}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>

        <div className="grid gap-4">
          {/* 顧客選択と訪問時刻 */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* 顧客選択 */}
            <FormField
              control={form.control}
              name={`visitRecords.${index}.customerId`}
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    顧客 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <CustomerSelect
                      customers={customers}
                      value={field.value}
                      onChange={field.onChange}
                      isLoading={customersLoading}
                      error={!!fieldState.error}
                      placeholder="顧客を選択"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 訪問時刻 */}
            <FormField
              control={form.control}
              name={`visitRecords.${index}.visitTime`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>訪問時刻</FormLabel>
                  <FormControl>
                    <Input type="time" placeholder="HH:MM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 訪問内容 */}
          <FormField
            control={form.control}
            name={`visitRecords.${index}.content`}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  訪問内容 <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="訪問内容を入力してください"
                    className="min-h-[100px] resize-none"
                    aria-invalid={!!fieldState.error}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
