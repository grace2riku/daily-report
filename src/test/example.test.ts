import { describe, expect, it } from 'vitest';

describe('Example Test', () => {
  it('should pass basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string comparison', () => {
    const message = 'Hello, World!';
    expect(message).toContain('Hello');
  });
});
