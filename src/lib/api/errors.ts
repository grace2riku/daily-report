import type { ErrorCode } from '@/types/api';

/**
 * API エラークラス
 */
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string
  ) {
    super(message || code);
    this.name = 'ApiError';
  }
}

/**
 * バリデーションエラークラス
 */
export class ValidationError extends ApiError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

/**
 * 認証エラークラス
 */
export class UnauthorizedError extends ApiError {
  constructor(message?: string) {
    super('UNAUTHORIZED', message || '認証が必要です');
    this.name = 'UnauthorizedError';
  }
}

/**
 * 権限エラークラス
 */
export class ForbiddenError extends ApiError {
  constructor(message?: string) {
    super('FORBIDDEN', message || 'この操作を行う権限がありません');
    this.name = 'ForbiddenError';
  }
}

/**
 * Not Found エラークラス
 */
export class NotFoundError extends ApiError {
  constructor(message?: string) {
    super('NOT_FOUND', message || 'リソースが見つかりません');
    this.name = 'NotFoundError';
  }
}

/**
 * 競合エラークラス
 */
export class ConflictError extends ApiError {
  constructor(code: ErrorCode, message?: string) {
    super(code, message);
    this.name = 'ConflictError';
  }
}
