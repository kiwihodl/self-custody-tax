// API Rate Limiting
// Token bucket algorithm with daily limits per API key

import { createClient } from '@/lib/supabase/server';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  reset: string; // ISO timestamp when limit resets
}

/**
 * Check rate limit for an API key
 * Uses daily limit (resets at midnight UTC)
 */
export async function checkRateLimit(
  apiKeyId: string,
  dailyLimit: number = 1000
): Promise<RateLimitResult> {
  const supabase = await createClient();

  // Get start of current UTC day
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Get tomorrow for reset time
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  // Count requests today
  const { count, error } = await supabase
    .from('api_requests')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', apiKeyId)
    .gte('created_at', today.toISOString());

  const currentCount = count || 0;

  if (error) {
    // On error, allow the request but log it
    console.error('Rate limit check error:', error);
    return {
      allowed: true,
      remaining: dailyLimit - 1,
      limit: dailyLimit,
      reset: tomorrow.toISOString(),
    };
  }

  if (currentCount >= dailyLimit) {
    return {
      allowed: false,
      remaining: 0,
      limit: dailyLimit,
      reset: tomorrow.toISOString(),
    };
  }

  return {
    allowed: true,
    remaining: dailyLimit - currentCount - 1,
    limit: dailyLimit,
    reset: tomorrow.toISOString(),
  };
}

/**
 * Log an API request for rate limiting and analytics
 */
export async function logApiRequest(params: {
  apiKeyId: string;
  userId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}): Promise<void> {
  const supabase = await createClient();

  // Fire and forget - don't await
  supabase
    .from('api_requests')
    .insert({
      api_key_id: params.apiKeyId,
      user_id: params.userId,
      endpoint: params.endpoint,
      method: params.method,
      status_code: params.statusCode,
      response_time_ms: params.responseTimeMs,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      error_message: params.errorMessage,
    })
    .then(({ error }) => {
      if (error) {
        console.error('Failed to log API request:', error);
      }
    });
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset,
  };
}

/**
 * Get API usage statistics for a user
 */
export async function getApiUsageStats(
  userId: string,
  days: number = 30
): Promise<{
  totalRequests: number;
  requestsByEndpoint: Record<string, number>;
  requestsByDay: { date: string; count: number }[];
  errorRate: number;
}> {
  const supabase = await createClient();

  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - days);

  // Get all requests in the period
  const { data: requests } = await supabase
    .from('api_requests')
    .select('endpoint, status_code, created_at')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (!requests || requests.length === 0) {
    return {
      totalRequests: 0,
      requestsByEndpoint: {},
      requestsByDay: [],
      errorRate: 0,
    };
  }

  // Calculate stats
  const totalRequests = requests.length;
  const errors = requests.filter(r => r.status_code >= 400).length;
  const errorRate = (errors / totalRequests) * 100;

  // Group by endpoint
  const requestsByEndpoint: Record<string, number> = {};
  requests.forEach(r => {
    requestsByEndpoint[r.endpoint] = (requestsByEndpoint[r.endpoint] || 0) + 1;
  });

  // Group by day
  const byDay: Record<string, number> = {};
  requests.forEach(r => {
    const date = r.created_at.split('T')[0];
    byDay[date] = (byDay[date] || 0) + 1;
  });

  const requestsByDay = Object.entries(byDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalRequests,
    requestsByEndpoint,
    requestsByDay,
    errorRate: Math.round(errorRate * 100) / 100,
  };
}
