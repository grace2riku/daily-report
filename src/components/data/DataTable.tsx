'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { Pagination, PaginationInfo } from './Pagination';

export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  sortConfig?: SortConfig;
  onSort?: (key: string) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    perPage: number;
    onPageChange: (page: number) => void;
  };
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends object>({
  columns,
  data,
  keyExtractor,
  sortConfig,
  onSort,
  pagination,
  isLoading,
  emptyMessage = 'データがありません',
  className,
  onRowClick,
}: DataTableProps<T>) {
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="h-4 w-4" />;
    }
    return <ArrowDown className="h-4 w-4" />;
  };

  const handleSort = (key: string) => {
    onSort?.(key);
  };

  const getCellValue = (item: T, column: Column<T>, index: number): React.ReactNode => {
    if (column.render) {
      return column.render(item, index);
    }
    const value = (item as Record<string, unknown>)[column.key];
    if (value === null || value === undefined) {
      return '-';
    }
    return String(value);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.sortable && onSort ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8 hover:bg-transparent"
                      onClick={() => handleSort(column.key)}
                    >
                      {column.header}
                      <span className="ml-2">{getSortIcon(column.key)}</span>
                    </Button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  className={cn(onRowClick && 'cursor-pointer hover:bg-muted/50')}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {getCellValue(item, column, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <PaginationInfo
            currentPage={pagination.currentPage}
            perPage={pagination.perPage}
            totalCount={pagination.totalCount}
          />
          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={pagination.onPageChange}
              disabled={isLoading}
            />
          )}
        </div>
      )}
    </div>
  );
}
