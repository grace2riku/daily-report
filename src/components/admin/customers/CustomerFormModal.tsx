'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { LoadingSpinner } from '@/components/common/Loading';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Customer, CustomerFormData } from '@/types/customer';

// 電話番号の正規表現（日本の電話番号形式）
const phoneRegex = /^(0\d{1,4}-?\d{1,4}-?\d{3,4})?$/;

// フォームのバリデーションスキーマ
const createFormSchema = (isEditMode: boolean) =>
  z.object({
    customerCode: isEditMode
      ? z.string()
      : z
          .string()
          .min(1, '顧客コードを入力してください')
          .max(20, '顧客コードは20文字以内で入力してください')
          .regex(/^[a-zA-Z0-9]+$/, '顧客コードは半角英数字で入力してください'),
    name: z
      .string()
      .min(1, '顧客名を入力してください')
      .max(200, '顧客名は200文字以内で入力してください'),
    address: z
      .string()
      .max(500, '住所は500文字以内で入力してください')
      .optional()
      .or(z.literal('')),
    phone: z
      .string()
      .refine((val) => !val || phoneRegex.test(val), {
        message: '電話番号の形式が正しくありません（例: 03-1234-5678）',
      })
      .optional()
      .or(z.literal('')),
    isActive: z.boolean(),
  });

type FormSchema = z.infer<ReturnType<typeof createFormSchema>>;

interface CustomerFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  customer?: Customer | null;
  isLoading?: boolean;
}

/**
 * 顧客登録・編集モーダル
 */
export function CustomerFormModal({
  open,
  onOpenChange,
  onSubmit,
  customer,
  isLoading = false,
}: CustomerFormModalProps) {
  const isEditMode = !!customer;
  const formSchema = createFormSchema(isEditMode);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerCode: '',
      name: '',
      address: '',
      phone: '',
      isActive: true,
    },
  });

  // 編集時にフォームに値をセット
  useEffect(() => {
    if (open) {
      if (customer) {
        form.reset({
          customerCode: customer.customer_code,
          name: customer.name,
          address: customer.address || '',
          phone: customer.phone || '',
          isActive: customer.is_active,
        });
      } else {
        form.reset({
          customerCode: '',
          name: '',
          address: '',
          phone: '',
          isActive: true,
        });
      }
    }
  }, [open, customer, form]);

  const handleSubmit = async (data: FormSchema) => {
    await onSubmit({
      customerCode: data.customerCode,
      name: data.name,
      address: data.address || '',
      phone: data.phone || '',
      isActive: data.isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '顧客 編集' : '顧客 登録'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? '顧客の情報を編集します。' : '新しい顧客を登録します。'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>顧客コード *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="C001" disabled={isEditMode || isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>顧客名 *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="株式会社ABC" disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>住所</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="東京都港区..."
                      disabled={isLoading}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>電話番号</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="03-1234-5678" disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>状態 *</FormLabel>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isActive"
                        checked={field.value === true}
                        onChange={() => field.onChange(true)}
                        disabled={isLoading}
                        className="h-4 w-4"
                      />
                      <span>有効</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isActive"
                        checked={field.value === false}
                        onChange={() => field.onChange(false)}
                        disabled={isLoading}
                        className="h-4 w-4"
                      />
                      <span>無効</span>
                    </label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <LoadingSpinner className="mr-2" />}
                保存
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
