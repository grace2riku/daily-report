/**
 * API共通レスポンス型定義
 */

// 成功レスポンス
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

// ページネーション付き成功レスポンス
export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: Pagination;
}

// エラーレスポンス
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
  };
}

// APIレスポンス（成功またはエラー）
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ページネーション情報
export interface Pagination {
  currentPage: number;
  perPage: number;
  totalPages: number;
  totalCount: number;
}

// エラーコード
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_DISABLED'
  | 'DUPLICATE_REPORT'
  | 'DUPLICATE_EMPLOYEE_CODE'
  | 'DUPLICATE_EMAIL'
  | 'DUPLICATE_CUSTOMER_CODE';

// HTTPステータスコードとエラーコードのマッピング
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
  INVALID_CREDENTIALS: 401,
  ACCOUNT_DISABLED: 401,
  DUPLICATE_REPORT: 409,
  DUPLICATE_EMPLOYEE_CODE: 409,
  DUPLICATE_EMAIL: 409,
  DUPLICATE_CUSTOMER_CODE: 409,
};

// エラーコードとデフォルトメッセージのマッピング
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  BAD_REQUEST: 'リクエストが不正です',
  UNAUTHORIZED: '認証が必要です',
  FORBIDDEN: 'この操作を行う権限がありません',
  NOT_FOUND: 'リソースが見つかりません',
  CONFLICT: 'リソースが競合しています',
  VALIDATION_ERROR: '入力値が不正です',
  INTERNAL_ERROR: 'サーバーエラーが発生しました',
  INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが正しくありません',
  ACCOUNT_DISABLED: 'アカウントが無効化されています',
  DUPLICATE_REPORT: '同一日付の日報が既に存在します',
  DUPLICATE_EMPLOYEE_CODE: 'この社員番号は既に使用されています',
  DUPLICATE_EMAIL: 'このメールアドレスは既に使用されています',
  DUPLICATE_CUSTOMER_CODE: 'この顧客コードは既に使用されています',
};
