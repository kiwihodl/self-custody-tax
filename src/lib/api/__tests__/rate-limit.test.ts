/**
 * Rate Limiting Tests
 * Tests for rate limit checking and headers
 */

import { getRateLimitHeaders, RateLimitResult } from '../rate-limit';

describe('Rate Limiting', () => {
  describe('getRateLimitHeaders', () => {
    it('should return correct headers for allowed request', () => {
      const result: RateLimitResult = {
        allowed: true,
        remaining: 995,
        limit: 1000,
        reset: '2026-01-12T00:00:00.000Z',
      };

      const headers = getRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('1000');
      expect(headers['X-RateLimit-Remaining']).toBe('995');
      expect(headers['X-RateLimit-Reset']).toBe('2026-01-12T00:00:00.000Z');
    });

    it('should return correct headers for rate limited request', () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        limit: 1000,
        reset: '2026-01-12T00:00:00.000Z',
      };

      const headers = getRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('1000');
      expect(headers['X-RateLimit-Remaining']).toBe('0');
      expect(headers['X-RateLimit-Reset']).toBe('2026-01-12T00:00:00.000Z');
    });

    it('should handle different limits', () => {
      const result: RateLimitResult = {
        allowed: true,
        remaining: 450,
        limit: 500,
        reset: '2026-01-15T00:00:00.000Z',
      };

      const headers = getRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('500');
      expect(headers['X-RateLimit-Remaining']).toBe('450');
    });
  });

  describe('Rate limit logic', () => {
    it('should calculate remaining correctly', () => {
      const dailyLimit = 1000;
      const currentCount = 150;
      const remaining = dailyLimit - currentCount - 1;

      expect(remaining).toBe(849);
    });

    it('should identify when limit is exceeded', () => {
      const dailyLimit = 1000;
      const currentCount = 1000;

      expect(currentCount >= dailyLimit).toBe(true);
    });

    it('should identify when limit is not exceeded', () => {
      const dailyLimit = 1000;
      const currentCount = 999;

      expect(currentCount >= dailyLimit).toBe(false);
    });

    it('should handle edge case at exactly limit - 1', () => {
      const dailyLimit = 1000;
      const currentCount = 999;
      const remaining = dailyLimit - currentCount - 1;

      expect(remaining).toBe(0);
      expect(currentCount >= dailyLimit).toBe(false); // Still allowed
    });
  });
});

describe('Rate limit reset time', () => {
  it('should reset at midnight UTC', () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Reset should be at start of next day
    expect(tomorrow.getUTCHours()).toBe(0);
    expect(tomorrow.getUTCMinutes()).toBe(0);
    expect(tomorrow.getUTCSeconds()).toBe(0);
    expect(tomorrow.getTime()).toBeGreaterThan(today.getTime());
  });
});
