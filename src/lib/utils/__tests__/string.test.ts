import { describe, expect, it } from 'vitest';

import { truncate, escapeHtml } from '../string';

describe('string utilities', () => {
  describe('truncate', () => {
    it('should return original string if shorter than maxLength', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should return original string if equal to maxLength', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('should truncate and add ellipsis for longer strings', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('should handle maxLength less than or equal to 3', () => {
      expect(truncate('Hello', 3)).toBe('Hel');
      expect(truncate('Hello', 2)).toBe('He');
      expect(truncate('Hello', 1)).toBe('H');
    });

    it('should return empty string for maxLength of 0', () => {
      expect(truncate('Hello', 0)).toBe('');
    });

    it('should return empty string for negative maxLength', () => {
      expect(truncate('Hello', -5)).toBe('');
    });

    it('should return empty string for empty input', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('should return empty string for null input', () => {
      // @ts-expect-error Testing invalid input
      expect(truncate(null, 10)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      // @ts-expect-error Testing invalid input
      expect(truncate(undefined, 10)).toBe('');
    });

    it('should return empty string for non-string input', () => {
      // @ts-expect-error Testing invalid input
      expect(truncate(12345, 10)).toBe('');
    });

    it('should handle Japanese characters correctly', () => {
      const japanese = 'こんにちは世界';
      expect(truncate(japanese, 5)).toBe('こん...');
      expect(truncate(japanese, 7)).toBe(japanese);
    });

    it('should truncate strings with emoji (note: emoji may be split due to UTF-16)', () => {
      // Note: JavaScript's slice operates on UTF-16 code units.
      // Emojis are typically 2 code units, so they may be split during truncation.
      // This is a known limitation of simple truncation.
      const emoji = 'Hello 🌍🌎🌏';
      const result = truncate(emoji, 10);
      // The result will contain 7 characters from slice (10-3 for ellipsis)
      // which may include partial emoji code units
      expect(result.length).toBe(10);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should handle strings with newlines', () => {
      const multiline = 'Line1\nLine2\nLine3';
      expect(truncate(multiline, 10)).toBe('Line1\nL...');
    });

    it('should work with exact boundary cases', () => {
      // String of exactly 4 characters, truncate to 4
      expect(truncate('ABCD', 4)).toBe('ABCD');
      // String of 5 characters, truncate to 4 (needs ellipsis but maxLength <= 3 behavior)
      expect(truncate('ABCDE', 4)).toBe('A...');
    });
  });

  describe('escapeHtml', () => {
    it('should escape ampersand', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape less than sign', () => {
      expect(escapeHtml('a < b')).toBe('a &lt; b');
    });

    it('should escape greater than sign', () => {
      expect(escapeHtml('a > b')).toBe('a &gt; b');
    });

    it('should escape double quotes', () => {
      expect(escapeHtml('Say "Hello"')).toBe('Say &quot;Hello&quot;');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("It's fine")).toBe('It&#x27;s fine');
    });

    it('should escape all special characters in HTML tags', () => {
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
      );
    });

    it('should escape multiple occurrences', () => {
      expect(escapeHtml('a & b & c')).toBe('a &amp; b &amp; c');
    });

    it('should return original string if no special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    it('should return empty string for empty input', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should return empty string for null input', () => {
      // @ts-expect-error Testing invalid input
      expect(escapeHtml(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      // @ts-expect-error Testing invalid input
      expect(escapeHtml(undefined)).toBe('');
    });

    it('should return empty string for non-string input', () => {
      // @ts-expect-error Testing invalid input
      expect(escapeHtml(12345)).toBe('');
    });

    it('should handle mixed HTML content', () => {
      const html = '<div class="test" data-value=\'123\'>&nbsp;</div>';
      const expected =
        '&lt;div class=&quot;test&quot; data-value=&#x27;123&#x27;&gt;&amp;nbsp;&lt;/div&gt;';
      expect(escapeHtml(html)).toBe(expected);
    });

    it('should handle already escaped content (double escaping)', () => {
      // Note: this function does not prevent double escaping
      expect(escapeHtml('&amp;')).toBe('&amp;amp;');
    });

    it('should handle Japanese characters without escaping', () => {
      expect(escapeHtml('こんにちは')).toBe('こんにちは');
    });

    it('should escape special characters in Japanese mixed content', () => {
      expect(escapeHtml('価格: 1000円 & 税込')).toBe('価格: 1000円 &amp; 税込');
    });

    it('should handle newlines and whitespace', () => {
      expect(escapeHtml('Hello\n<World>')).toBe('Hello\n&lt;World&gt;');
    });
  });
});
