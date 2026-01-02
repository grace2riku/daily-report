import { describe, expect, it } from 'vitest';

import {
  formatDateJapanese,
  formatDateSlash,
  formatDateISO,
  formatDateTime,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  isToday,
  isFutureDate,
  parseDate,
  getToday,
} from '../date';

describe('date utilities', () => {
  describe('formatDateJapanese', () => {
    // UT-001-01: 正常な日付変換
    it('should format date string to Japanese format', () => {
      // 2025-01-15 is Wednesday
      const result = formatDateJapanese('2025-01-15');
      expect(result).toBe('2025年1月15日（水）');
    });

    it('should format Date object to Japanese format', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      const result = formatDateJapanese(date);
      expect(result).toBe('2025年1月15日（水）');
    });

    // UT-001-02: 無効な日付
    it('should return null for invalid date string', () => {
      const result = formatDateJapanese('invalid');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = formatDateJapanese('');
      expect(result).toBeNull();
    });

    // UT-001-03: null入力
    it('should return null for null input', () => {
      const result = formatDateJapanese(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = formatDateJapanese(undefined);
      expect(result).toBeNull();
    });

    it('should correctly display all weekdays', () => {
      const testCases = [
        { date: '2025-01-12', expected: '2025年1月12日（日）' }, // Sunday
        { date: '2025-01-13', expected: '2025年1月13日（月）' }, // Monday
        { date: '2025-01-14', expected: '2025年1月14日（火）' }, // Tuesday
        { date: '2025-01-15', expected: '2025年1月15日（水）' }, // Wednesday
        { date: '2025-01-16', expected: '2025年1月16日（木）' }, // Thursday
        { date: '2025-01-17', expected: '2025年1月17日（金）' }, // Friday
        { date: '2025-01-18', expected: '2025年1月18日（土）' }, // Saturday
      ];

      testCases.forEach(({ date, expected }) => {
        expect(formatDateJapanese(date)).toBe(expected);
      });
    });
  });

  describe('formatDateSlash', () => {
    it('should format date to YYYY/MM/DD format', () => {
      const result = formatDateSlash('2025-01-05');
      expect(result).toBe('2025/01/05');
    });

    it('should pad single digit month and day with zeros', () => {
      const result = formatDateSlash(new Date(2025, 0, 5)); // January 5
      expect(result).toBe('2025/01/05');
    });

    it('should return null for invalid date', () => {
      expect(formatDateSlash('invalid')).toBeNull();
    });

    it('should return null for null input', () => {
      expect(formatDateSlash(null)).toBeNull();
    });
  });

  describe('formatDateISO', () => {
    it('should format date to YYYY-MM-DD format', () => {
      const result = formatDateISO('2025-01-15');
      expect(result).toBe('2025-01-15');
    });

    it('should format Date object to ISO format', () => {
      const date = new Date(2025, 0, 5); // January 5, 2025
      const result = formatDateISO(date);
      expect(result).toBe('2025-01-05');
    });

    it('should return null for invalid date string', () => {
      expect(formatDateISO('not-a-date')).toBeNull();
    });

    it('should return null for null input', () => {
      expect(formatDateISO(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(formatDateISO(undefined)).toBeNull();
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime to YYYY/MM/DD HH:MM format', () => {
      const date = new Date(2025, 0, 15, 14, 30); // January 15, 2025, 14:30
      const result = formatDateTime(date);
      expect(result).toBe('2025/01/15 14:30');
    });

    it('should pad single digit hours and minutes', () => {
      const date = new Date(2025, 0, 5, 9, 5); // January 5, 2025, 09:05
      const result = formatDateTime(date);
      expect(result).toBe('2025/01/05 09:05');
    });

    it('should return null for invalid date', () => {
      expect(formatDateTime('invalid')).toBeNull();
    });

    it('should return null for null input', () => {
      expect(formatDateTime(null)).toBeNull();
    });
  });

  describe('getFirstDayOfMonth', () => {
    it('should return first day of given month', () => {
      const date = new Date(2025, 5, 15); // June 15, 2025
      const result = getFirstDayOfMonth(date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(5); // June
      expect(result.getDate()).toBe(1);
    });

    it('should return first day of current month when no argument', () => {
      const result = getFirstDayOfMonth();
      const now = new Date();
      expect(result.getFullYear()).toBe(now.getFullYear());
      expect(result.getMonth()).toBe(now.getMonth());
      expect(result.getDate()).toBe(1);
    });
  });

  describe('getLastDayOfMonth', () => {
    it('should return last day of given month', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      const result = getLastDayOfMonth(date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(31);
    });

    it('should handle February in leap year', () => {
      const date = new Date(2024, 1, 10); // February 10, 2024 (leap year)
      const result = getLastDayOfMonth(date);
      expect(result.getDate()).toBe(29);
    });

    it('should handle February in non-leap year', () => {
      const date = new Date(2025, 1, 10); // February 10, 2025
      const result = getLastDayOfMonth(date);
      expect(result.getDate()).toBe(28);
    });

    it('should return last day of current month when no argument', () => {
      const result = getLastDayOfMonth();
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      expect(result.getDate()).toBe(lastDay.getDate());
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it('should return true for today as string', () => {
      const today = new Date();
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(isToday(todayString)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('isFutureDate', () => {
    it('should return true for future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(isFutureDate(futureDate)).toBe(true);
    });

    it('should return true for future date as string', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateString = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;
      expect(isFutureDate(futureDateString)).toBe(true);
    });

    it('should return false for today', () => {
      const today = new Date();
      expect(isFutureDate(today)).toBe(false);
    });

    it('should return false for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(isFutureDate(pastDate)).toBe(false);
    });

    it('should not mutate the original Date object', () => {
      const originalDate = new Date(2030, 0, 15, 10, 30, 45);
      const originalTime = originalDate.getTime();
      isFutureDate(originalDate);
      expect(originalDate.getTime()).toBe(originalTime);
    });
  });

  describe('parseDate', () => {
    it('should parse valid date string to Date object', () => {
      const result = parseDate('2025-01-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(0); // January is 0
      expect(result?.getDate()).toBe(15);
    });

    it('should parse various date formats', () => {
      // ISO format
      expect(parseDate('2025-06-20')).toBeInstanceOf(Date);

      // Date with time
      expect(parseDate('2025-01-15T10:30:00')).toBeInstanceOf(Date);
    });

    it('should return null for invalid date string', () => {
      expect(parseDate('invalid')).toBeNull();
      expect(parseDate('not-a-date')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseDate('')).toBeNull();
    });

    it('should return null for non-string input', () => {
      // @ts-expect-error Testing invalid input
      expect(parseDate(null)).toBeNull();
      // @ts-expect-error Testing invalid input
      expect(parseDate(undefined)).toBeNull();
      // @ts-expect-error Testing invalid input
      expect(parseDate(12345)).toBeNull();
    });
  });

  describe('getToday', () => {
    it('should return today in YYYY-MM-DD format', () => {
      const result = getToday();
      const today = new Date();
      const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(result).toBe(expected);
    });

    it('should match regex pattern YYYY-MM-DD', () => {
      const result = getToday();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should pad single digit month and day with zeros', () => {
      // We test the format consistency
      const result = getToday();
      const parts = result.split('-');
      expect(parts[0]).toHaveLength(4); // Year
      expect(parts[1]).toHaveLength(2); // Month
      expect(parts[2]).toHaveLength(2); // Day
    });

    it('should return a parseable date string', () => {
      const result = getToday();
      const parsed = new Date(result);
      expect(parsed).toBeInstanceOf(Date);
      expect(isNaN(parsed.getTime())).toBe(false);
    });
  });
});
