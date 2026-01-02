import { describe, expect, it } from 'vitest';

import {
  isValidEmail,
  isValidPhone,
  isValidEmployeeCode,
  isValidCustomerCode,
  isValidTimeFormat,
} from '../validation';

describe('validation utilities', () => {
  describe('isValidEmail', () => {
    // UT-002-01: 有効なメールアドレス
    it('should return true for valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('should return true for valid email with subdomain', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true);
    });

    it('should return true for valid email with plus sign', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should return true for valid email with dots in local part', () => {
      expect(isValidEmail('first.last@example.com')).toBe(true);
    });

    it('should return true for valid email with numbers', () => {
      expect(isValidEmail('user123@example123.com')).toBe(true);
    });

    // UT-002-02: 無効なメールアドレス
    it('should return false for email without @', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
    });

    it('should return false for email without domain', () => {
      expect(isValidEmail('test@')).toBe(false);
    });

    it('should return false for email without local part', () => {
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('should return false for email without TLD', () => {
      expect(isValidEmail('test@example')).toBe(false);
    });

    it('should return false for email with spaces', () => {
      expect(isValidEmail('test @example.com')).toBe(false);
      expect(isValidEmail('test@ example.com')).toBe(false);
    });

    // UT-002-03: 空文字
    it('should return false for empty string', () => {
      expect(isValidEmail('')).toBe(false);
    });

    it('should return false for null', () => {
      // @ts-expect-error Testing invalid input
      expect(isValidEmail(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      // @ts-expect-error Testing invalid input
      expect(isValidEmail(undefined)).toBe(false);
    });

    it('should return false for non-string input', () => {
      // @ts-expect-error Testing invalid input
      expect(isValidEmail(12345)).toBe(false);
      // @ts-expect-error Testing invalid input
      expect(isValidEmail({})).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    // UT-002-04: 有効な電話番号
    it('should return true for valid phone with hyphens', () => {
      expect(isValidPhone('03-1234-5678')).toBe(true);
    });

    it('should return true for valid phone without hyphens', () => {
      expect(isValidPhone('0312345678')).toBe(true);
    });

    it('should return true for mobile phone number', () => {
      expect(isValidPhone('090-1234-5678')).toBe(true);
      expect(isValidPhone('080-1234-5678')).toBe(true);
      expect(isValidPhone('070-1234-5678')).toBe(true);
    });

    it('should return true for mobile phone without hyphens', () => {
      expect(isValidPhone('09012345678')).toBe(true);
    });

    it('should return true for various area code formats', () => {
      expect(isValidPhone('045-123-4567')).toBe(true);
      expect(isValidPhone('0123-45-6789')).toBe(true);
    });

    // UT-002-05: 無効な電話番号
    it('should return false for alphabetic characters', () => {
      expect(isValidPhone('abcd')).toBe(false);
    });

    it('should return false for mixed alphanumeric', () => {
      expect(isValidPhone('03-1234-abcd')).toBe(false);
    });

    it('should return false for phone not starting with 0', () => {
      expect(isValidPhone('13-1234-5678')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidPhone('')).toBe(false);
    });

    it('should return false for null', () => {
      // @ts-expect-error Testing invalid input
      expect(isValidPhone(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      // @ts-expect-error Testing invalid input
      expect(isValidPhone(undefined)).toBe(false);
    });

    it('should return false for phone with spaces', () => {
      expect(isValidPhone('03 1234 5678')).toBe(false);
    });
  });

  describe('isValidEmployeeCode', () => {
    it('should return true for alphanumeric code', () => {
      expect(isValidEmployeeCode('EMP001')).toBe(true);
    });

    it('should return true for numeric only code', () => {
      expect(isValidEmployeeCode('12345')).toBe(true);
    });

    it('should return true for alphabetic only code', () => {
      expect(isValidEmployeeCode('ABCDEF')).toBe(true);
    });

    it('should return true for lowercase letters', () => {
      expect(isValidEmployeeCode('emp001')).toBe(true);
    });

    it('should return true for single character', () => {
      expect(isValidEmployeeCode('A')).toBe(true);
    });

    it('should return true for 20 character code (max length)', () => {
      expect(isValidEmployeeCode('A'.repeat(20))).toBe(true);
    });

    it('should return false for 21 character code (exceeds max)', () => {
      expect(isValidEmployeeCode('A'.repeat(21))).toBe(false);
    });

    it('should return false for code with hyphens', () => {
      expect(isValidEmployeeCode('EMP-001')).toBe(false);
    });

    it('should return false for code with underscores', () => {
      expect(isValidEmployeeCode('EMP_001')).toBe(false);
    });

    it('should return false for code with spaces', () => {
      expect(isValidEmployeeCode('EMP 001')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidEmployeeCode('')).toBe(false);
    });

    it('should return false for null', () => {
      // @ts-expect-error Testing invalid input
      expect(isValidEmployeeCode(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      // @ts-expect-error Testing invalid input
      expect(isValidEmployeeCode(undefined)).toBe(false);
    });

    it('should return false for Japanese characters', () => {
      expect(isValidEmployeeCode('従業員001')).toBe(false);
    });
  });

  describe('isValidCustomerCode', () => {
    it('should return true for alphanumeric code', () => {
      expect(isValidCustomerCode('C001')).toBe(true);
    });

    it('should return true for numeric only code', () => {
      expect(isValidCustomerCode('12345')).toBe(true);
    });

    it('should return true for alphabetic only code', () => {
      expect(isValidCustomerCode('CUSTOMER')).toBe(true);
    });

    it('should return true for lowercase letters', () => {
      expect(isValidCustomerCode('customer001')).toBe(true);
    });

    it('should return true for single character', () => {
      expect(isValidCustomerCode('C')).toBe(true);
    });

    it('should return true for 20 character code (max length)', () => {
      expect(isValidCustomerCode('C'.repeat(20))).toBe(true);
    });

    it('should return false for 21 character code (exceeds max)', () => {
      expect(isValidCustomerCode('C'.repeat(21))).toBe(false);
    });

    it('should return false for code with hyphens', () => {
      expect(isValidCustomerCode('CUST-001')).toBe(false);
    });

    it('should return false for code with special characters', () => {
      expect(isValidCustomerCode('C@001')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidCustomerCode('')).toBe(false);
    });

    it('should return false for null', () => {
      // @ts-expect-error Testing invalid input
      expect(isValidCustomerCode(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      // @ts-expect-error Testing invalid input
      expect(isValidCustomerCode(undefined)).toBe(false);
    });
  });

  describe('isValidTimeFormat', () => {
    it('should return true for valid time format', () => {
      expect(isValidTimeFormat('10:00')).toBe(true);
      expect(isValidTimeFormat('09:30')).toBe(true);
      expect(isValidTimeFormat('23:59')).toBe(true);
      expect(isValidTimeFormat('00:00')).toBe(true);
    });

    it('should return false for invalid hour', () => {
      expect(isValidTimeFormat('24:00')).toBe(false);
      expect(isValidTimeFormat('25:00')).toBe(false);
    });

    it('should return false for invalid minute', () => {
      expect(isValidTimeFormat('10:60')).toBe(false);
      expect(isValidTimeFormat('10:99')).toBe(false);
    });

    it('should return false for missing leading zero', () => {
      expect(isValidTimeFormat('9:30')).toBe(false);
      expect(isValidTimeFormat('10:5')).toBe(false);
    });

    it('should return false for invalid format', () => {
      expect(isValidTimeFormat('10-00')).toBe(false);
      expect(isValidTimeFormat('10:00:00')).toBe(false);
      expect(isValidTimeFormat('1000')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidTimeFormat('')).toBe(false);
    });

    it('should return false for null', () => {
      // @ts-expect-error Testing invalid input
      expect(isValidTimeFormat(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      // @ts-expect-error Testing invalid input
      expect(isValidTimeFormat(undefined)).toBe(false);
    });
  });
});
