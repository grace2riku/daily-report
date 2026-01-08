'use client';

import { Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { CustomerTable, CustomerFormModal, CustomerSearchForm } from '@/components/admin/customers';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingPage } from '@/components/common/Loading';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { useRequireRole } from '@/hooks/useAuth';
import { useCustomersAdmin } from '@/hooks/useCustomersAdmin';
import type { Customer, CustomerFormData } from '@/types/customer';

/**
 * 顧客マスタ画面（SCR-006）
 *
 * 顧客の一覧表示、登録、編集、削除を行う管理画面。
 * 管理者のみアクセス可能。
 */
export default function CustomersAdminPage() {
  // 管理者権限のみアクセス可能
  const auth = useRequireRole(['admin']);

  const {
    customers,
    pagination,
    isLoading,
    error,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  } = useCustomersAdmin();

  // モーダルの状態
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 検索条件
  const [keyword, setKeyword] = useState('');
  const [currentKeyword, setCurrentKeyword] = useState('');

  // 初回読み込みフラグ
  const isInitializedRef = useRef(false);

  // 現在のページ
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * データを取得
   */
  const loadData = useCallback(
    async (page: number = 1, searchKeyword: string = '') => {
      await fetchCustomers({ page, per_page: 20, keyword: searchKeyword || undefined });
      setCurrentPage(page);
    },
    [fetchCustomers]
  );

  // 認証完了後に初回データ取得
  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated && !isInitializedRef.current) {
      isInitializedRef.current = true;
      loadData(1, '');
    }
  }, [auth.isLoading, auth.isAuthenticated, loadData]);

  /**
   * 検索実行
   */
  const handleSearch = (searchKeyword: string) => {
    setCurrentKeyword(searchKeyword);
    loadData(1, searchKeyword);
  };

  /**
   * 新規登録ボタンクリック
   */
  const handleCreateClick = () => {
    setSelectedCustomer(null);
    setIsFormModalOpen(true);
  };

  /**
   * 編集ボタンクリック
   */
  const handleEditClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsFormModalOpen(true);
  };

  /**
   * 削除ボタンクリック
   */
  const handleDeleteClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  /**
   * フォーム送信
   */
  const handleFormSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);

    try {
      if (selectedCustomer) {
        // 更新
        const result = await updateCustomer(selectedCustomer.id, {
          name: data.name,
          address: data.address || null,
          phone: data.phone || null,
          is_active: data.isActive,
        });

        if (result.success) {
          toast.success('顧客を更新しました');
          setIsFormModalOpen(false);
          await loadData(currentPage, currentKeyword);
        } else {
          toast.error(result.error || '更新に失敗しました');
        }
      } else {
        // 新規登録
        const result = await createCustomer({
          customer_code: data.customerCode,
          name: data.name,
          address: data.address || null,
          phone: data.phone || null,
          is_active: data.isActive,
        });

        if (result.success) {
          toast.success('顧客を登録しました');
          setIsFormModalOpen(false);
          await loadData(1, currentKeyword);
        } else {
          toast.error(result.error || '登録に失敗しました');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 削除実行
   */
  const handleDeleteConfirm = async () => {
    if (!selectedCustomer) return;

    setIsSubmitting(true);

    try {
      const result = await deleteCustomer(selectedCustomer.id);

      if (result.success) {
        toast.success('顧客を削除しました');
        setIsDeleteDialogOpen(false);
        await loadData(currentPage, currentKeyword);
      } else {
        toast.error(result.error || '削除に失敗しました');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * ページ変更
   */
  const handlePageChange = (page: number) => {
    loadData(page, currentKeyword);
  };

  // 認証ローディング中
  if (auth.isLoading) {
    return <LoadingPage />;
  }

  // 未認証または権限なし（リダイレクト処理中）
  if (!auth.isAuthenticated || auth.user?.role !== 'admin') {
    return <LoadingPage />;
  }

  return (
    <PageContainer
      title="顧客マスタ管理"
      breadcrumbs={[{ label: '顧客マスタ管理' }]}
      actions={
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          新規登録
        </Button>
      }
    >
      {/* 検索フォーム */}
      <CustomerSearchForm
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={handleSearch}
        isLoading={isLoading}
      />

      {/* エラーメッセージ */}
      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* 顧客一覧 */}
      <CustomerTable
        customers={customers}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={handlePageChange}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />

      {/* 登録・編集モーダル */}
      <CustomerFormModal
        open={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        onSubmit={handleFormSubmit}
        customer={selectedCustomer}
        isLoading={isSubmitting}
      />

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="顧客の削除"
        description={
          selectedCustomer
            ? `「${selectedCustomer.name}」を削除しますか？この操作により、顧客は無効化されます。`
            : ''
        }
        confirmLabel="削除"
        cancelLabel="キャンセル"
        onConfirm={handleDeleteConfirm}
        isLoading={isSubmitting}
        variant="destructive"
      />
    </PageContainer>
  );
}
