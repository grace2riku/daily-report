'use client';

import { Edit, Trash2 } from 'lucide-react';

import { DataTable, type Column } from '@/components/data/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SalesPerson } from '@/types/sales-person';
import { ROLE_LABELS } from '@/types/sales-person';

interface SalesPersonTableProps {
  salesPersons: SalesPerson[];
  pagination?: {
    currentPage: number;
    perPage: number;
    totalPages: number;
    totalCount: number;
  } | null;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
  onEdit: (salesPerson: SalesPerson) => void;
  onDelete: (salesPerson: SalesPerson) => void;
}

/**
 * 営業担当者一覧テーブル
 */
export function SalesPersonTable({
  salesPersons,
  pagination,
  isLoading,
  onPageChange,
  onEdit,
  onDelete,
}: SalesPersonTableProps) {
  const columns: Column<SalesPerson>[] = [
    {
      key: 'employee_code',
      header: '社員番号',
      className: 'w-[120px]',
    },
    {
      key: 'name',
      header: '氏名',
      className: 'min-w-[120px]',
    },
    {
      key: 'email',
      header: 'メール',
      className: 'min-w-[200px]',
    },
    {
      key: 'role',
      header: '役職',
      className: 'w-[100px]',
      render: (item) => (
        <Badge
          variant={
            item.role === 'admin' ? 'default' : item.role === 'manager' ? 'secondary' : 'outline'
          }
        >
          {ROLE_LABELS[item.role]}
        </Badge>
      ),
    },
    {
      key: 'manager',
      header: '上長',
      className: 'min-w-[100px]',
      render: (item) => item.manager?.name || '-',
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
      data={salesPersons}
      keyExtractor={(item) => item.id}
      isLoading={isLoading}
      emptyMessage="営業担当者が見つかりませんでした"
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
