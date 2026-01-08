'use client';

import { Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { SalesPersonTable, SalesPersonFormModal } from '@/components/admin/sales-persons';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingPage } from '@/components/common/Loading';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { useRequireRole } from '@/hooks/useAuth';
import { useSalesPersons } from '@/hooks/useSalesPersons';
import { useSalesPersonsAdmin } from '@/hooks/useSalesPersonsAdmin';
import type { SalesPerson, SalesPersonFormData } from '@/types/sales-person';

/**
 * 営業マスタ画面（SCR-005）
 *
 * 営業担当者の一覧表示、登録、編集、削除を行う管理画面。
 * 管理者のみアクセス可能。
 */
export default function SalesPersonsAdminPage() {
  // 管理者権限のみアクセス可能
  const auth = useRequireRole(['admin']);

  const {
    salesPersons,
    pagination,
    isLoading,
    error,
    fetchSalesPersons,
    createSalesPerson,
    updateSalesPerson,
    deleteSalesPerson,
  } = useSalesPersonsAdmin();

  // 上長選択用の営業担当者一覧（全件取得）
  const { salesPersons: managers, fetchSalesPersons: fetchManagers } = useSalesPersons();

  // モーダルの状態
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<SalesPerson | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 初回読み込みフラグ
  const isInitializedRef = useRef(false);

  // 現在のページ
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * データを取得
   */
  const loadData = useCallback(
    async (page: number = 1) => {
      await fetchSalesPersons({ page, per_page: 20 });
      setCurrentPage(page);
    },
    [fetchSalesPersons]
  );

  // 認証完了後に初回データ取得
  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated && !isInitializedRef.current) {
      isInitializedRef.current = true;
      loadData(1);
      fetchManagers();
    }
  }, [auth.isLoading, auth.isAuthenticated, loadData, fetchManagers]);

  /**
   * 新規登録ボタンクリック
   */
  const handleCreateClick = () => {
    setSelectedSalesPerson(null);
    setIsFormModalOpen(true);
  };

  /**
   * 編集ボタンクリック
   */
  const handleEditClick = (salesPerson: SalesPerson) => {
    setSelectedSalesPerson(salesPerson);
    setIsFormModalOpen(true);
  };

  /**
   * 削除ボタンクリック
   */
  const handleDeleteClick = (salesPerson: SalesPerson) => {
    setSelectedSalesPerson(salesPerson);
    setIsDeleteDialogOpen(true);
  };

  /**
   * フォーム送信
   */
  const handleFormSubmit = async (data: SalesPersonFormData) => {
    setIsSubmitting(true);

    try {
      if (selectedSalesPerson) {
        // 更新
        const updateData: {
          name: string;
          email: string;
          password?: string;
          role: 'member' | 'manager' | 'admin';
          manager_id: number | null;
          is_active: boolean;
        } = {
          name: data.name,
          email: data.email,
          role: data.role,
          manager_id: data.managerId,
          is_active: data.isActive,
        };

        // パスワードが入力されている場合のみ含める
        if (data.password && data.password.length > 0) {
          updateData.password = data.password;
        }

        const result = await updateSalesPerson(selectedSalesPerson.id, updateData);

        if (result.success) {
          toast.success('営業担当者を更新しました');
          setIsFormModalOpen(false);
          await loadData(currentPage);
          await fetchManagers();
        } else {
          toast.error(result.error || '更新に失敗しました');
        }
      } else {
        // 新規登録
        const result = await createSalesPerson({
          employee_code: data.employeeCode,
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          manager_id: data.managerId,
          is_active: data.isActive,
        });

        if (result.success) {
          toast.success('営業担当者を登録しました');
          setIsFormModalOpen(false);
          await loadData(1);
          await fetchManagers();
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
    if (!selectedSalesPerson) return;

    setIsSubmitting(true);

    try {
      const result = await deleteSalesPerson(selectedSalesPerson.id);

      if (result.success) {
        toast.success('営業担当者を削除しました');
        setIsDeleteDialogOpen(false);
        await loadData(currentPage);
        await fetchManagers();
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
    loadData(page);
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
      title="営業マスタ管理"
      breadcrumbs={[{ label: '営業マスタ管理' }]}
      actions={
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          新規登録
        </Button>
      }
    >
      {/* エラーメッセージ */}
      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* 営業担当者一覧 */}
      <SalesPersonTable
        salesPersons={salesPersons}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={handlePageChange}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />

      {/* 登録・編集モーダル */}
      <SalesPersonFormModal
        open={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        onSubmit={handleFormSubmit}
        salesPerson={selectedSalesPerson}
        managers={managers}
        isLoading={isSubmitting}
      />

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="営業担当者の削除"
        description={
          selectedSalesPerson
            ? `「${selectedSalesPerson.name}」を削除しますか？この操作により、営業担当者は無効化されます。`
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
