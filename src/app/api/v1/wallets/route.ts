// GET /api/v1/wallets - List all wallets
// Public API endpoint for Advisor tier users

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateApiKey } from '@/lib/api/auth';
import { checkRateLimit, logApiRequest } from '@/lib/api/rate-limit';
import { apiSuccess, apiError, apiErrorFromCode, API_ERRORS, parsePagination, paginationMeta } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;

  // Validate API key
  const authResult = await validateApiKey(request);

  if (!authResult.success) {
    return apiError(
      authResult.status === 403 ? 'upgrade_required' : 'unauthorized',
      authResult.error,
      { status: authResult.status }
    );
  }

  const { user, apiKey } = authResult;

  // Check rate limit
  const rateLimit = await checkRateLimit(apiKey.id, apiKey.rate_limit_daily);

  if (!rateLimit.allowed) {
    // Log the rate-limited request
    logApiRequest({
      apiKeyId: apiKey.id,
      userId: user.id,
      endpoint: '/api/v1/wallets',
      method: 'GET',
      statusCode: 429,
      responseTimeMs: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      errorMessage: 'Rate limit exceeded',
    });

    return apiErrorFromCode(API_ERRORS.RATE_LIMITED, {
      rateLimit,
      details: {
        reset: rateLimit.reset,
        limit: rateLimit.limit,
      },
    });
  }

  try {
    const supabase = await createClient();
    const { page, perPage, offset } = parsePagination(searchParams);

    // Get filters
    const network = searchParams.get('network');
    const type = searchParams.get('type');

    // Build query
    let query = supabase
      .from('wallets')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (network) {
      query = query.eq('network', network);
    }

    if (type) {
      query = query.eq('type', type);
    }

    // Apply pagination
    query = query.range(offset, offset + perPage - 1);

    const { data: wallets, error, count } = await query;

    if (error) {
      throw error;
    }

    // Format response
    const formattedWallets = (wallets || []).map(wallet => ({
      id: wallet.id,
      name: wallet.name,
      type: wallet.type,
      network: wallet.network,
      balance: wallet.balance?.toString() || '0',
      balance_usd: wallet.balance_usd || 0,
      xpub: wallet.xpub ? `${wallet.xpub.slice(0, 20)}...` : null, // Truncate for security
      address: wallet.address,
      derivation_path: wallet.derivation_path,
      last_synced_at: wallet.last_synced_at,
      sync_status: wallet.sync_status,
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
    }));

    // Log successful request
    logApiRequest({
      apiKeyId: apiKey.id,
      userId: user.id,
      endpoint: '/api/v1/wallets',
      method: 'GET',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return apiSuccess(formattedWallets, {
      meta: paginationMeta(count || 0, page, perPage),
      rateLimit,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log error
    logApiRequest({
      apiKeyId: apiKey.id,
      userId: user.id,
      endpoint: '/api/v1/wallets',
      method: 'GET',
      statusCode: 500,
      responseTimeMs: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      errorMessage,
    });

    return apiErrorFromCode(API_ERRORS.INTERNAL_ERROR, {
      rateLimit,
      details: { message: errorMessage },
    });
  }
}
