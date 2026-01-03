import { describe, expect, it } from 'vitest';

import { calculateOffset, calculatePagination, errorResponse, successResponse } from '../response';

describe('API Response Helpers', () => {
  describe('successResponse', () => {
    it('should return a success response with data', async () => {
      const data = { id: 1, name: 'Test' };
      const response = successResponse(data);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
    });

    it('should return a success response with array data', async () => {
      const data = [
        { id: 1, name: 'Test1' },
        { id: 2, name: 'Test2' },
      ];
      const response = successResponse(data);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
    });

    it('should return a success response with empty object', async () => {
      const data = {};
      const response = successResponse(data);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.data).toEqual({});
    });

    it('should return a success response with null data', async () => {
      const response = successResponse(null);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.data).toBeNull();
    });

    it('should return HTTP status 200 by default', () => {
      const response = successResponse({ test: true });
      expect(response.status).toBe(200);
    });
  });

  describe('errorResponse', () => {
    it('should return an error response with BAD_REQUEST', async () => {
      const response = errorResponse('BAD_REQUEST');
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('BAD_REQUEST');
      expect(json.error.message).toBe('リクエストが不正です');
    });

    it('should return an error response with UNAUTHORIZED', async () => {
      const response = errorResponse('UNAUTHORIZED');
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
      expect(json.error.message).toBe('認証が必要です');
    });

    it('should return an error response with FORBIDDEN', async () => {
      const response = errorResponse('FORBIDDEN');
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
      expect(json.error.message).toBe('この操作を行う権限がありません');
    });

    it('should return an error response with NOT_FOUND', async () => {
      const response = errorResponse('NOT_FOUND');
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('NOT_FOUND');
      expect(json.error.message).toBe('リソースが見つかりません');
    });

    it('should return an error response with CONFLICT', async () => {
      const response = errorResponse('CONFLICT');
      const json = await response.json();

      expect(response.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('CONFLICT');
      expect(json.error.message).toBe('リソースが競合しています');
    });

    it('should return an error response with VALIDATION_ERROR', async () => {
      const response = errorResponse('VALIDATION_ERROR');
      const json = await response.json();

      expect(response.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toBe('入力値が不正です');
    });

    it('should return an error response with INTERNAL_ERROR', async () => {
      const response = errorResponse('INTERNAL_ERROR');
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INTERNAL_ERROR');
      expect(json.error.message).toBe('サーバーエラーが発生しました');
    });

    it('should return an error response with custom message', async () => {
      const customMessage = 'カスタムエラーメッセージ';
      const response = errorResponse('BAD_REQUEST', customMessage);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('BAD_REQUEST');
      expect(json.error.message).toBe(customMessage);
    });

    it('should return an error response with INVALID_CREDENTIALS', async () => {
      const response = errorResponse('INVALID_CREDENTIALS');
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_CREDENTIALS');
      expect(json.error.message).toBe('メールアドレスまたはパスワードが正しくありません');
    });

    it('should return an error response with ACCOUNT_DISABLED', async () => {
      const response = errorResponse('ACCOUNT_DISABLED');
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('ACCOUNT_DISABLED');
      expect(json.error.message).toBe('アカウントが無効化されています');
    });

    it('should return an error response with DUPLICATE_REPORT', async () => {
      const response = errorResponse('DUPLICATE_REPORT');
      const json = await response.json();

      expect(response.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('DUPLICATE_REPORT');
      expect(json.error.message).toBe('同一日付の日報が既に存在します');
    });

    it('should return an error response with DUPLICATE_EMPLOYEE_CODE', async () => {
      const response = errorResponse('DUPLICATE_EMPLOYEE_CODE');
      const json = await response.json();

      expect(response.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('DUPLICATE_EMPLOYEE_CODE');
      expect(json.error.message).toBe('この社員番号は既に使用されています');
    });

    it('should return an error response with DUPLICATE_EMAIL', async () => {
      const response = errorResponse('DUPLICATE_EMAIL');
      const json = await response.json();

      expect(response.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('DUPLICATE_EMAIL');
      expect(json.error.message).toBe('このメールアドレスは既に使用されています');
    });

    it('should return an error response with DUPLICATE_CUSTOMER_CODE', async () => {
      const response = errorResponse('DUPLICATE_CUSTOMER_CODE');
      const json = await response.json();

      expect(response.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('DUPLICATE_CUSTOMER_CODE');
      expect(json.error.message).toBe('この顧客コードは既に使用されています');
    });
  });

  describe('calculatePagination', () => {
    it('should calculate pagination for first page', () => {
      const pagination = calculatePagination(1, 20, 100);

      expect(pagination.current_page).toBe(1);
      expect(pagination.per_page).toBe(20);
      expect(pagination.total_pages).toBe(5);
      expect(pagination.total_count).toBe(100);
    });

    it('should calculate pagination for middle page', () => {
      const pagination = calculatePagination(3, 20, 100);

      expect(pagination.current_page).toBe(3);
      expect(pagination.per_page).toBe(20);
      expect(pagination.total_pages).toBe(5);
      expect(pagination.total_count).toBe(100);
    });

    it('should calculate pagination for last page', () => {
      const pagination = calculatePagination(5, 20, 100);

      expect(pagination.current_page).toBe(5);
      expect(pagination.per_page).toBe(20);
      expect(pagination.total_pages).toBe(5);
      expect(pagination.total_count).toBe(100);
    });

    it('should handle total count not divisible by per page', () => {
      const pagination = calculatePagination(1, 20, 105);

      expect(pagination.current_page).toBe(1);
      expect(pagination.per_page).toBe(20);
      expect(pagination.total_pages).toBe(6);
      expect(pagination.total_count).toBe(105);
    });

    it('should handle zero total count', () => {
      const pagination = calculatePagination(1, 20, 0);

      expect(pagination.current_page).toBe(1);
      expect(pagination.per_page).toBe(20);
      expect(pagination.total_pages).toBe(0);
      expect(pagination.total_count).toBe(0);
    });

    it('should handle small per page value', () => {
      const pagination = calculatePagination(1, 5, 100);

      expect(pagination.current_page).toBe(1);
      expect(pagination.per_page).toBe(5);
      expect(pagination.total_pages).toBe(20);
      expect(pagination.total_count).toBe(100);
    });

    it('should handle single item total', () => {
      const pagination = calculatePagination(1, 20, 1);

      expect(pagination.current_page).toBe(1);
      expect(pagination.per_page).toBe(20);
      expect(pagination.total_pages).toBe(1);
      expect(pagination.total_count).toBe(1);
    });

    it('should handle per page larger than total count', () => {
      const pagination = calculatePagination(1, 100, 50);

      expect(pagination.current_page).toBe(1);
      expect(pagination.per_page).toBe(100);
      expect(pagination.total_pages).toBe(1);
      expect(pagination.total_count).toBe(50);
    });
  });

  describe('calculateOffset', () => {
    it('should return 0 for first page', () => {
      expect(calculateOffset(1, 20)).toBe(0);
    });

    it('should return correct offset for second page', () => {
      expect(calculateOffset(2, 20)).toBe(20);
    });

    it('should return correct offset for third page', () => {
      expect(calculateOffset(3, 20)).toBe(40);
    });

    it('should handle different per page values', () => {
      expect(calculateOffset(2, 10)).toBe(10);
      expect(calculateOffset(2, 50)).toBe(50);
      expect(calculateOffset(2, 100)).toBe(100);
    });

    it('should handle large page numbers', () => {
      expect(calculateOffset(100, 20)).toBe(1980);
    });
  });
});
