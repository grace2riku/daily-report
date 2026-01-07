'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Save, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingSpinner } from '@/components/common/Loading';
import { DatePicker } from '@/components/form/DatePicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useCustomers } from '@/hooks/useCustomers';
import type { CreateReportInput, ReportDetail, UpdateReportInput } from '@/hooks/useReport';
import { useReportMutation } from '@/hooks/useReport';
import { formatDateISO, parseDate } from '@/lib/utils/date';
import {
  defaultVisitRecordValues,
  getDefaultReportFormValues,
  reportFormSchema,
  type ReportFormValues,
} from '@/lib/validations/report-form';

import { VisitRecordForm } from './VisitRecordForm';

interface ReportFormProps {
  mode: 'create' | 'edit';
  initialData?: ReportDetail;
  onSuccess?: (report: ReportDetail) => void;
}

/**
 * 日報入力フォームコンポーネント
 *
 * 新規作成・編集の両方に対応
 * - 報告日、訪問記録、Problem/Plan を入力
 * - 訪問記録は動的に追加・削除可能
 * - 下書き保存 / 提出の2つの保存方法
 * - 離脱時の確認ダイアログ
 */
export function ReportForm({ mode, initialData, onSuccess }: ReportFormProps) {
  const router = useRouter();
  const { customers, isLoading: customersLoading, fetchCustomers } = useCustomers();
  const { createReport, updateReport, isLoading: isSaving, error: saveError } = useReportMutation();

  // 離脱確認ダイアログの状態
  const [showLeaveDialog, setShowLeaveDialog] = React.useState(false);
  const [pendingNavigation, setPendingNavigation] = React.useState<string | null>(null);

  // フォームの初期値を作成
  const defaultValues = React.useMemo<ReportFormValues>(() => {
    if (mode === 'edit' && initialData) {
      return {
        reportDate: initialData.report_date,
        problem: initialData.problem || '',
        plan: initialData.plan || '',
        status: initialData.status === 'reviewed' ? 'submitted' : initialData.status,
        visitRecords: initialData.visit_records.map((vr) => ({
          id: vr.id,
          customerId: vr.customer.id,
          visitTime: vr.visit_time || '',
          content: vr.content,
        })),
      };
    }
    return getDefaultReportFormValues();
  }, [mode, initialData]);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'visitRecords',
  });

  // 顧客データを取得
  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // フォームが変更されたかどうかを追跡
  const isDirty = form.formState.isDirty;

  // ページ離脱時の警告
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  /**
   * ナビゲーション処理（離脱確認付き）
   */
  const handleNavigation = React.useCallback(
    (path: string) => {
      if (isDirty) {
        setPendingNavigation(path);
        setShowLeaveDialog(true);
      } else {
        router.push(path);
      }
    },
    [isDirty, router]
  );

  /**
   * 離脱確認ダイアログで「離脱する」を選択
   */
  const handleConfirmLeave = React.useCallback(() => {
    setShowLeaveDialog(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
  }, [pendingNavigation, router]);

  /**
   * 訪問記録を追加
   */
  const handleAddVisitRecord = () => {
    append({ ...defaultVisitRecordValues });
  };

  /**
   * 訪問記録を削除
   */
  const handleRemoveVisitRecord = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  /**
   * フォームを送信
   */
  const handleSubmit = async (values: ReportFormValues, status: 'draft' | 'submitted') => {
    try {
      const visitRecords = values.visitRecords.map((vr, index) => ({
        id: vr.id,
        customer_id: vr.customerId,
        visit_time: vr.visitTime || undefined,
        content: vr.content,
        sort_order: index,
      }));

      if (mode === 'create') {
        const input: CreateReportInput = {
          report_date: values.reportDate,
          problem: values.problem || undefined,
          plan: values.plan || undefined,
          status,
          visit_records: visitRecords.map(({ id: _id, ...rest }) => rest),
        };

        const result = await createReport(input);
        form.reset(values);
        if (onSuccess) {
          onSuccess(result);
        } else {
          router.push('/');
        }
      } else if (initialData) {
        const input: UpdateReportInput = {
          report_date: values.reportDate,
          problem: values.problem || undefined,
          plan: values.plan || undefined,
          status,
          visit_records: visitRecords,
        };

        const result = await updateReport(initialData.id, input);
        form.reset(values);
        if (onSuccess) {
          onSuccess(result);
        } else {
          router.push(`/reports/${initialData.id}`);
        }
      }
    } catch {
      // エラーはuseReportMutationが管理
    }
  };

  /**
   * 下書き保存
   */
  const handleSaveDraft = () => {
    form.handleSubmit((values) => handleSubmit(values, 'draft'))();
  };

  /**
   * 提出
   */
  const handleSubmitReport = () => {
    form.handleSubmit((values) => handleSubmit(values, 'submitted'))();
  };

  /**
   * キャンセル
   */
  const handleCancel = () => {
    if (mode === 'edit' && initialData) {
      handleNavigation(`/reports/${initialData.id}`);
    } else {
      handleNavigation('/');
    }
  };

  return (
    <>
      <Form {...form}>
        <form className="space-y-6">
          {/* エラーメッセージ */}
          {saveError && <ErrorMessage message={saveError} className="mb-4" />}

          {/* 報告日 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">基本情報</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="reportDate"
                render={({ field, fieldState }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>
                      報告日 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        value={parseDate(field.value) || undefined}
                        onChange={(date) => {
                          const formatted = date ? formatDateISO(date) : '';
                          field.onChange(formatted);
                        }}
                        maxDate={new Date()}
                        placeholder="報告日を選択"
                        className={fieldState.error ? 'border-destructive' : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 訪問記録 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  訪問記録 <span className="text-destructive">*</span>
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={handleAddVisitRecord}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  追加
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.formState.errors.visitRecords?.root?.message && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.visitRecords.root.message}
                </p>
              )}
              {fields.map((field, index) => (
                <VisitRecordForm
                  key={field.id}
                  index={index}
                  customers={customers}
                  customersLoading={customersLoading}
                  onRemove={() => handleRemoveVisitRecord(index)}
                  canRemove={fields.length > 1}
                />
              ))}
            </CardContent>
          </Card>

          {/* Problem / Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Problem / Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Problem */}
              <FormField
                control={form.control}
                name="problem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Problem（課題・相談）</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="現在の課題や相談事項があれば入力してください"
                        className="min-h-[120px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Plan */}
              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan（明日やること）</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="明日の予定や計画があれば入力してください"
                        className="min-h-[120px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* アクションボタン */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
              キャンセル
            </Button>
            <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={isSaving}>
              {isSaving ? (
                <LoadingSpinner className="mr-2" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              下書き保存
            </Button>
            <Button type="button" onClick={handleSubmitReport} disabled={isSaving}>
              {isSaving ? (
                <LoadingSpinner className="mr-2" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              提出
            </Button>
          </div>
        </form>
      </Form>

      {/* 離脱確認ダイアログ */}
      <ConfirmDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        title="ページを離れますか？"
        description="入力した内容は保存されません。本当にこのページを離れますか？"
        confirmLabel="離脱する"
        cancelLabel="キャンセル"
        onConfirm={handleConfirmLeave}
        variant="destructive"
      />
    </>
  );
}
