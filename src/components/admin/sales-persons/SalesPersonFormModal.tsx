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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserRole } from '@/types/auth';
import type { SalesPerson, SalesPersonFormData } from '@/types/sales-person';

// フォームのバリデーションスキーマ
const createFormSchema = (isEditMode: boolean) =>
  z.object({
    employeeCode: z
      .string()
      .min(1, '社員番号を入力してください')
      .max(20, '社員番号は20文字以内で入力してください')
      .regex(/^[a-zA-Z0-9]+$/, '社員番号は半角英数字で入力してください'),
    name: z
      .string()
      .min(1, '氏名を入力してください')
      .max(100, '氏名は100文字以内で入力してください'),
    email: z
      .string()
      .min(1, 'メールアドレスを入力してください')
      .email('有効なメールアドレスを入力してください')
      .max(255, 'メールアドレスは255文字以内で入力してください'),
    password: isEditMode
      ? z
          .string()
          .refine((val) => val === '' || val.length >= 8, 'パスワードは8文字以上で入力してください')
          .optional()
          .or(z.literal(''))
      : z.string().min(8, 'パスワードは8文字以上で入力してください'),
    role: z.enum(['member', 'manager', 'admin']),
    managerId: z.number().nullable(),
    isActive: z.boolean(),
  });

type FormSchema = z.infer<ReturnType<typeof createFormSchema>>;

interface SalesPersonFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SalesPersonFormData) => Promise<void>;
  salesPerson?: SalesPerson | null;
  managers: { id: number; name: string }[];
  isLoading?: boolean;
}

/**
 * 営業担当者登録・編集モーダル
 */
export function SalesPersonFormModal({
  open,
  onOpenChange,
  onSubmit,
  salesPerson,
  managers,
  isLoading = false,
}: SalesPersonFormModalProps) {
  const isEditMode = !!salesPerson;
  const formSchema = createFormSchema(isEditMode);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeCode: '',
      name: '',
      email: '',
      password: '',
      role: 'member' as UserRole,
      managerId: null,
      isActive: true,
    },
  });

  // 編集時にフォームに値をセット
  useEffect(() => {
    if (open) {
      if (salesPerson) {
        form.reset({
          employeeCode: salesPerson.employee_code,
          name: salesPerson.name,
          email: salesPerson.email,
          password: '',
          role: salesPerson.role,
          managerId: salesPerson.manager?.id ?? null,
          isActive: salesPerson.is_active,
        });
      } else {
        form.reset({
          employeeCode: '',
          name: '',
          email: '',
          password: '',
          role: 'member',
          managerId: null,
          isActive: true,
        });
      }
    }
  }, [open, salesPerson, form]);

  const handleSubmit = async (data: FormSchema) => {
    await onSubmit({
      employeeCode: data.employeeCode,
      name: data.name,
      email: data.email,
      password: data.password || '',
      role: data.role,
      managerId: data.managerId,
      isActive: data.isActive,
    });
  };

  // 自分自身を上長として選択できないようにフィルタ
  const availableManagers = salesPerson
    ? managers.filter((m) => m.id !== salesPerson.id)
    : managers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '営業担当者 編集' : '営業担当者 登録'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? '営業担当者の情報を編集します。' : '新しい営業担当者を登録します。'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="employeeCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>社員番号 *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="EMP001" disabled={isEditMode || isLoading} />
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
                  <FormLabel>氏名 *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="山田太郎" disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メールアドレス *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="yamada@example.com"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>パスワード {isEditMode ? '(変更する場合のみ入力)' : '*'}</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="********" disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>役職 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="役職を選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="member">一般</SelectItem>
                      <SelectItem value="manager">上長</SelectItem>
                      <SelectItem value="admin">管理者</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="managerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>上長</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === 'none' ? null : parseInt(value, 10))
                    }
                    value={field.value?.toString() ?? 'none'}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="上長を選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">選択なし</SelectItem>
                      {availableManagers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id.toString()}>
                          {manager.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
