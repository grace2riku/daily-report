import { describe, expect, it } from 'vitest';

import {
  ApiError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../errors';

describe('API Error Classes', () => {
  describe('ApiError', () => {
    it('should create an error with code and default message', () => {
      const error = new ApiError('BAD_REQUEST');

      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('BAD_REQUEST');
      expect(error.name).toBe('ApiError');
      expect(error instanceof Error).toBe(true);
    });

    it('should create an error with code and custom message', () => {
      const error = new ApiError('BAD_REQUEST', 'Custom error message');

      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Custom error message');
      expect(error.name).toBe('ApiError');
    });

    it('should be an instance of Error', () => {
      const error = new ApiError('INTERNAL_ERROR');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with message', () => {
      const error = new ValidationError('入力値が不正です');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('入力値が不正です');
      expect(error.name).toBe('ValidationError');
    });

    it('should be an instance of ApiError', () => {
      const error = new ValidationError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(ValidationError);
    });

    it('should have correct code for validation errors', () => {
      const error = new ValidationError('メールアドレスの形式が不正です');

      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create an unauthorized error with default message', () => {
      const error = new UnauthorizedError();

      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('認証が必要です');
      expect(error.name).toBe('UnauthorizedError');
    });

    it('should create an unauthorized error with custom message', () => {
      const error = new UnauthorizedError('トークンが無効です');

      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('トークンが無効です');
      expect(error.name).toBe('UnauthorizedError');
    });

    it('should be an instance of ApiError', () => {
      const error = new UnauthorizedError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(UnauthorizedError);
    });
  });

  describe('ForbiddenError', () => {
    it('should create a forbidden error with default message', () => {
      const error = new ForbiddenError();

      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('この操作を行う権限がありません');
      expect(error.name).toBe('ForbiddenError');
    });

    it('should create a forbidden error with custom message', () => {
      const error = new ForbiddenError('管理者権限が必要です');

      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('管理者権限が必要です');
      expect(error.name).toBe('ForbiddenError');
    });

    it('should be an instance of ApiError', () => {
      const error = new ForbiddenError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(ForbiddenError);
    });
  });

  describe('NotFoundError', () => {
    it('should create a not found error with default message', () => {
      const error = new NotFoundError();

      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('リソースが見つかりません');
      expect(error.name).toBe('NotFoundError');
    });

    it('should create a not found error with custom message', () => {
      const error = new NotFoundError('日報が見つかりません');

      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('日報が見つかりません');
      expect(error.name).toBe('NotFoundError');
    });

    it('should be an instance of ApiError', () => {
      const error = new NotFoundError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(NotFoundError);
    });
  });

  describe('ConflictError', () => {
    it('should create a conflict error with DUPLICATE_REPORT code', () => {
      const error = new ConflictError('DUPLICATE_REPORT', '同一日付の日報が既に存在します');

      expect(error.code).toBe('DUPLICATE_REPORT');
      expect(error.message).toBe('同一日付の日報が既に存在します');
      expect(error.name).toBe('ConflictError');
    });

    it('should create a conflict error with DUPLICATE_EMPLOYEE_CODE code', () => {
      const error = new ConflictError('DUPLICATE_EMPLOYEE_CODE', 'この社員番号は既に使用されています');

      expect(error.code).toBe('DUPLICATE_EMPLOYEE_CODE');
      expect(error.message).toBe('この社員番号は既に使用されています');
      expect(error.name).toBe('ConflictError');
    });

    it('should create a conflict error with DUPLICATE_EMAIL code', () => {
      const error = new ConflictError('DUPLICATE_EMAIL', 'このメールアドレスは既に使用されています');

      expect(error.code).toBe('DUPLICATE_EMAIL');
      expect(error.message).toBe('このメールアドレスは既に使用されています');
      expect(error.name).toBe('ConflictError');
    });

    it('should create a conflict error with DUPLICATE_CUSTOMER_CODE code', () => {
      const error = new ConflictError('DUPLICATE_CUSTOMER_CODE', 'この顧客コードは既に使用されています');

      expect(error.code).toBe('DUPLICATE_CUSTOMER_CODE');
      expect(error.message).toBe('この顧客コードは既に使用されています');
      expect(error.name).toBe('ConflictError');
    });

    it('should create a conflict error with CONFLICT code', () => {
      const error = new ConflictError('CONFLICT', 'リソースが競合しています');

      expect(error.code).toBe('CONFLICT');
      expect(error.message).toBe('リソースが競合しています');
      expect(error.name).toBe('ConflictError');
    });

    it('should be an instance of ApiError', () => {
      const error = new ConflictError('CONFLICT');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(ConflictError);
    });
  });

  describe('Error inheritance chain', () => {
    it('should correctly identify error types', () => {
      const apiError = new ApiError('BAD_REQUEST');
      const validationError = new ValidationError('Test');
      const unauthorizedError = new UnauthorizedError();
      const forbiddenError = new ForbiddenError();
      const notFoundError = new NotFoundError();
      const conflictError = new ConflictError('CONFLICT');

      // All should be Error instances
      expect(apiError instanceof Error).toBe(true);
      expect(validationError instanceof Error).toBe(true);
      expect(unauthorizedError instanceof Error).toBe(true);
      expect(forbiddenError instanceof Error).toBe(true);
      expect(notFoundError instanceof Error).toBe(true);
      expect(conflictError instanceof Error).toBe(true);

      // All specialized errors should be ApiError instances
      expect(validationError instanceof ApiError).toBe(true);
      expect(unauthorizedError instanceof ApiError).toBe(true);
      expect(forbiddenError instanceof ApiError).toBe(true);
      expect(notFoundError instanceof ApiError).toBe(true);
      expect(conflictError instanceof ApiError).toBe(true);
    });
  });
});
