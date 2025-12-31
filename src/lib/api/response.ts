import { NextResponse } from 'next/server';

import type {
  ApiSuccessResponse,
  ApiPaginatedResponse,
  ApiErrorResponse,
  ErrorCode,
  Pagination,
} from '@/types/api';
import { ERROR_STATUS_MAP, ERROR_MESSAGES } from '@/types/api';

/**
 * 成功レスポンスを生成
 */
export function successResponse<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
  } as ApiSuccessResponse<T>);
}

/**
 * ページネーション付き成功レスポンスを生成
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: Pagination
): NextResponse<ApiPaginatedResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    pagination,
  } as ApiPaginatedResponse<T>);
}

/**
 * エラーレスポンスを生成
 */
export function errorResponse(code: ErrorCode, message?: string): NextResponse<ApiErrorResponse> {
  const status = ERROR_STATUS_MAP[code] || 500;
  const errorMessage = message || ERROR_MESSAGES[code] || 'Unknown error';

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message: errorMessage,
      },
    } as ApiErrorResponse,
    { status }
  );
}

/**
 * ページネーション情報を計算
 */
export function calculatePagination(page: number, perPage: number, totalCount: number): Pagination {
  const totalPages = Math.ceil(totalCount / perPage);

  return {
    currentPage: page,
    perPage,
    totalPages,
    totalCount,
  };
}

/**
 * オフセットを計算
 */
export function calculateOffset(page: number, perPage: number): number {
  return (page - 1) * perPage;
}
