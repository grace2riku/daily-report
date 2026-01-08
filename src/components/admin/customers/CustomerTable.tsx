'use client';

import { Edit, Trash2 } from 'lucide-react';

import { DataTable, type Column } from '@/components/data/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Customer } from '@/types/customer';

interface CustomerTableProps {
  customers: Customer[];
  pagination?: {
    currentPage: number;
    perPage: number;
    totalPages: number;
    totalCount: number;
  } | null;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

/**
 * 顧客一覧テーブル
 */
export function CustomerTable({
  customers,
  pagination,
  isLoading,
  onPageChange,
  onEdit,
  onDelete,
}: CustomerTableProps) {
  const columns: Column<Customer>[] = [
    {
      key: 'customer_code',
      header: '顧客コード',
      className: 'w-[120px]',
    },
    {
      key: 'name',
      header: '顧客名',
      className: 'min-w-[200px]',
    },
    {
      key: 'phone',
      header: '電話番号',
      className: 'min-w-[140px]',
      render: (item) => item.phone || '-',
    },
    {
      key: 'is_active',
      header: '状態',
      className: 'w-[80px]',
      render: (item) => (
        <Badge variant={item.is_active ? 'default' : 'destructive'}>
          {item.is_active ? '有効' : '無効'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '操作',
      className: 'w-[120px]',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            aria-label={`${item.name}を編集`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
            disabled={!item.is_active}
            aria-label={`${item.name}を削除`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={customers}
      keyExtractor={(item) => item.id}
      isLoading={isLoading}
      emptyMessage="顧客が見つかりませんでした"
      pagination={
        pagination
          ? {
              ...pagination,
              onPageChange: onPageChange || (() => {}),
            }
          : undefined
      }
    />
  );
}
