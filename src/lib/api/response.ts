// Standard API Response Helpers
// Consistent response format for all API v1 endpoints

import { NextResponse } from 'next/server';
import { RateLimitResult, getRateLimitHeaders } from './rate-limit';

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
    has_more?: boolean;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Create a successful API response
 */
export function apiSuccess<T>(
  data: T,
  options?: {
    meta?: ApiSuccessResponse<T>['meta'];
    rateLimit?: RateLimitResult;
    status?: number;
  }
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = { data };

  if (options?.meta) {
    response.meta = options.meta;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.rateLimit) {
    Object.assign(headers, getRateLimitHeaders(options.rateLimit));
  }

  return NextResponse.json(response, {
    status: options?.status || 200,
    headers,
  });
}

/**
 * Create an error API response
 */
export function apiError(
  code: string,
  message: string,
  options?: {
    status?: number;
    details?: Record<string, unknown>;
    rateLimit?: RateLimitResult;
  }
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    error: {
      code,
      message,
    },
  };

  if (options?.details) {
    response.error.details = options.details;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.rateLimit) {
    Object.assign(headers, getRateLimitHeaders(options.rateLimit));
  }

  return NextResponse.json(response, {
    status: options?.status || 400,
    headers,
  });
}

// Common error codes
export const API_ERRORS = {
  // Authentication
  UNAUTHORIZED: { code: 'unauthorized', message: 'Authentication required', status: 401 },
  INVALID_API_KEY: { code: 'invalid_api_key', message: 'Invalid API key', status: 401 },
  KEY_REVOKED: { code: 'key_revoked', message: 'API key has been revoked', status: 401 },
  KEY_EXPIRED: { code: 'key_expired', message: 'API key has expired', status: 401 },

  // Authorization
  FORBIDDEN: { code: 'forbidden', message: 'Access denied', status: 403 },
  UPGRADE_REQUIRED: { code: 'upgrade_required', message: 'Advisor tier required for API access', status: 403 },
  SCOPE_REQUIRED: { code: 'scope_required', message: 'API key does not have required scope', status: 403 },

  // Rate limiting
  RATE_LIMITED: { code: 'rate_limited', message: 'Rate limit exceeded', status: 429 },

  // Resource errors
  NOT_FOUND: { code: 'not_found', message: 'Resource not found', status: 404 },
  ALREADY_EXISTS: { code: 'already_exists', message: 'Resource already exists', status: 409 },

  // Validation
  INVALID_REQUEST: { code: 'invalid_request', message: 'Invalid request', status: 400 },
  MISSING_PARAM: { code: 'missing_parameter', message: 'Missing required parameter', status: 400 },
  INVALID_PARAM: { code: 'invalid_parameter', message: 'Invalid parameter value', status: 400 },

  // Server errors
  INTERNAL_ERROR: { code: 'internal_error', message: 'Internal server error', status: 500 },
  SERVICE_UNAVAILABLE: { code: 'service_unavailable', message: 'Service temporarily unavailable', status: 503 },
} as const;

/**
 * Create error response from predefined error
 */
export function apiErrorFromCode(
  errorDef: typeof API_ERRORS[keyof typeof API_ERRORS],
  options?: {
    message?: string;
    details?: Record<string, unknown>;
    rateLimit?: RateLimitResult;
  }
): NextResponse<ApiErrorResponse> {
  return apiError(errorDef.code, options?.message || errorDef.message, {
    status: errorDef.status,
    details: options?.details,
    rateLimit: options?.rateLimit,
  });
}

/**
 * Parse pagination parameters from request
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaults: { page: number; perPage: number; maxPerPage: number } = {
    page: 1,
    perPage: 50,
    maxPerPage: 100,
  }
): { page: number; perPage: number; offset: number } {
  const parsedPage = parseInt(searchParams.get('page') || String(defaults.page), 10);
  const parsedPerPage = parseInt(searchParams.get('per_page') || String(defaults.perPage), 10);

  // Handle NaN by falling back to defaults
  const page = Math.max(1, Number.isNaN(parsedPage) ? defaults.page : parsedPage);
  const perPage = Math.min(
    defaults.maxPerPage,
    Math.max(1, Number.isNaN(parsedPerPage) ? defaults.perPage : parsedPerPage)
  );

  return {
    page,
    perPage,
    offset: (page - 1) * perPage,
  };
}

/**
 * Create pagination metadata
 */
export function paginationMeta(
  total: number,
  page: number,
  perPage: number
): ApiSuccessResponse<unknown>['meta'] {
  return {
    total,
    page,
    per_page: perPage,
    has_more: page * perPage < total,
  };
}
