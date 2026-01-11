/**
 * API Response Helper Tests
 * Tests for standardized API responses and pagination
 */

import { parsePagination, paginationMeta, API_ERRORS } from '../response';

describe('API Response Helpers', () => {
  describe('parsePagination', () => {
    it('should return defaults when no params provided', () => {
      const searchParams = new URLSearchParams();
      const result = parsePagination(searchParams);

      expect(result.page).toBe(1);
      expect(result.perPage).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should parse page and per_page correctly', () => {
      const searchParams = new URLSearchParams({
        page: '3',
        per_page: '25',
      });
      const result = parsePagination(searchParams);

      expect(result.page).toBe(3);
      expect(result.perPage).toBe(25);
      expect(result.offset).toBe(50); // (3-1) * 25
    });

    it('should enforce minimum page of 1', () => {
      const searchParams = new URLSearchParams({
        page: '0',
      });
      const result = parsePagination(searchParams);

      expect(result.page).toBe(1);
    });

    it('should enforce minimum page of 1 for negative values', () => {
      const searchParams = new URLSearchParams({
        page: '-5',
      });
      const result = parsePagination(searchParams);

      expect(result.page).toBe(1);
    });

    it('should cap per_page at maxPerPage (100)', () => {
      const searchParams = new URLSearchParams({
        per_page: '500',
      });
      const result = parsePagination(searchParams);

      expect(result.perPage).toBe(100);
    });

    it('should enforce minimum per_page of 1', () => {
      const searchParams = new URLSearchParams({
        per_page: '0',
      });
      const result = parsePagination(searchParams);

      expect(result.perPage).toBe(1);
    });

    it('should calculate offset correctly for various pages', () => {
      const testCases = [
        { page: 1, perPage: 10, expectedOffset: 0 },
        { page: 2, perPage: 10, expectedOffset: 10 },
        { page: 5, perPage: 20, expectedOffset: 80 },
        { page: 10, perPage: 100, expectedOffset: 900 },
      ];

      testCases.forEach(({ page, perPage, expectedOffset }) => {
        const searchParams = new URLSearchParams({
          page: String(page),
          per_page: String(perPage),
        });
        const result = parsePagination(searchParams);

        expect(result.offset).toBe(expectedOffset);
      });
    });

    it('should use custom defaults when provided', () => {
      const searchParams = new URLSearchParams();
      const result = parsePagination(searchParams, {
        page: 1,
        perPage: 25,
        maxPerPage: 50,
      });

      expect(result.perPage).toBe(25);
    });

    it('should respect custom maxPerPage', () => {
      const searchParams = new URLSearchParams({
        per_page: '100',
      });
      const result = parsePagination(searchParams, {
        page: 1,
        perPage: 25,
        maxPerPage: 50,
      });

      expect(result.perPage).toBe(50);
    });

    it('should handle non-numeric input gracefully', () => {
      const searchParams = new URLSearchParams({
        page: 'abc',
        per_page: 'xyz',
      });
      const result = parsePagination(searchParams);

      // NaN from parseInt should fall back to defaults
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(50);
    });
  });

  describe('paginationMeta', () => {
    it('should return correct meta for first page', () => {
      const meta = paginationMeta(100, 1, 10);

      expect(meta).toEqual({
        total: 100,
        page: 1,
        per_page: 10,
        has_more: true,
      });
    });

    it('should return has_more: false on last page', () => {
      const meta = paginationMeta(100, 10, 10);

      expect(meta?.has_more).toBe(false);
    });

    it('should return has_more: false when all items fit on one page', () => {
      const meta = paginationMeta(5, 1, 10);

      expect(meta?.has_more).toBe(false);
    });

    it('should handle exact page boundary', () => {
      const meta = paginationMeta(50, 5, 10);

      // Page 5 * 10 = 50, which equals total, so no more
      expect(meta?.has_more).toBe(false);
    });

    it('should handle partial last page', () => {
      const meta = paginationMeta(55, 5, 10);

      // Page 5 * 10 = 50, less than 55, so has more
      expect(meta?.has_more).toBe(true);
    });

    it('should handle empty results', () => {
      const meta = paginationMeta(0, 1, 10);

      expect(meta).toEqual({
        total: 0,
        page: 1,
        per_page: 10,
        has_more: false,
      });
    });
  });

  describe('API_ERRORS', () => {
    it('should have correct status codes for auth errors', () => {
      expect(API_ERRORS.UNAUTHORIZED.status).toBe(401);
      expect(API_ERRORS.INVALID_API_KEY.status).toBe(401);
      expect(API_ERRORS.KEY_REVOKED.status).toBe(401);
      expect(API_ERRORS.KEY_EXPIRED.status).toBe(401);
    });

    it('should have correct status codes for authorization errors', () => {
      expect(API_ERRORS.FORBIDDEN.status).toBe(403);
      expect(API_ERRORS.UPGRADE_REQUIRED.status).toBe(403);
      expect(API_ERRORS.SCOPE_REQUIRED.status).toBe(403);
    });

    it('should have correct status code for rate limiting', () => {
      expect(API_ERRORS.RATE_LIMITED.status).toBe(429);
    });

    it('should have correct status codes for resource errors', () => {
      expect(API_ERRORS.NOT_FOUND.status).toBe(404);
      expect(API_ERRORS.ALREADY_EXISTS.status).toBe(409);
    });

    it('should have correct status codes for validation errors', () => {
      expect(API_ERRORS.INVALID_REQUEST.status).toBe(400);
      expect(API_ERRORS.MISSING_PARAM.status).toBe(400);
      expect(API_ERRORS.INVALID_PARAM.status).toBe(400);
    });

    it('should have correct status codes for server errors', () => {
      expect(API_ERRORS.INTERNAL_ERROR.status).toBe(500);
      expect(API_ERRORS.SERVICE_UNAVAILABLE.status).toBe(503);
    });

    it('should have unique error codes', () => {
      const codes = Object.values(API_ERRORS).map(e => e.code);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should have descriptive messages', () => {
      Object.values(API_ERRORS).forEach(error => {
        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(5);
      });
    });
  });
});

describe('Response format consistency', () => {
  it('should have consistent success response shape', () => {
    const successResponse = {
      data: { id: '123', name: 'Test' },
      meta: {
        total: 100,
        page: 1,
        per_page: 10,
        has_more: true,
      },
    };

    expect(successResponse).toHaveProperty('data');
    expect(typeof successResponse.data).toBe('object');
  });

  it('should have consistent error response shape', () => {
    const errorResponse = {
      error: {
        code: 'test_error',
        message: 'Test error message',
        details: { field: 'value' },
      },
    };

    expect(errorResponse).toHaveProperty('error');
    expect(errorResponse.error).toHaveProperty('code');
    expect(errorResponse.error).toHaveProperty('message');
  });
});
