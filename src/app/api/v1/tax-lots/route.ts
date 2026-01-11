// GET /api/v1/tax-lots - List tax lots
// Public API endpoint for Advisor tier users

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateApiKey } from '@/lib/api/auth';
import { checkRateLimit, logApiRequest } from '@/lib/api/rate-limit';
import { apiSuccess, apiErrorFromCode, API_ERRORS, parsePagination, paginationMeta } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;

  // Validate API key
  const authResult = await validateApiKey(request);

  if (!authResult.success) {
    return apiErrorFromCode(
      authResult.status === 403 ? API_ERRORS.UPGRADE_REQUIRED : API_ERRORS.UNAUTHORIZED,
      { message: authResult.error }
    );
  }

  const { user, apiKey } = authResult;

  // Check rate limit
  const rateLimit = await checkRateLimit(apiKey.id, apiKey.rate_limit_daily);

  if (!rateLimit.allowed) {
    logApiRequest({
      apiKeyId: apiKey.id,
      userId: user.id,
      endpoint: '/api/v1/tax-lots',
      method: 'GET',
      statusCode: 429,
      responseTimeMs: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      errorMessage: 'Rate limit exceeded',
    });

    return apiErrorFromCode(API_ERRORS.RATE_LIMITED, { rateLimit });
  }

  try {
    const supabase = await createClient();
    const { page, perPage, offset } = parsePagination(searchParams);

    // Get filters
    const walletId = searchParams.get('wallet_id');
    const asset = searchParams.get('asset');
    const isDisposed = searchParams.get('is_disposed');
    const year = searchParams.get('year');

    // Build query
    let query = supabase
      .from('tax_lots')
      .select('*, wallets!inner(name)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('acquisition_date', { ascending: false });

    if (walletId) {
      query = query.eq('wallet_id', walletId);
    }

    if (asset) {
      query = query.eq('asset', asset.toUpperCase());
    }

    if (isDisposed !== null) {
      query = query.eq('is_disposed', isDisposed === 'true');
    }

    if (year) {
      const yearInt = parseInt(year, 10);
      const startOfYear = `${yearInt}-01-01`;
      const endOfYear = `${yearInt}-12-31`;
      query = query.gte('acquisition_date', startOfYear).lte('acquisition_date', endOfYear);
    }

    // Apply pagination
    query = query.range(offset, offset + perPage - 1);

    const { data: lots, error, count } = await query;

    if (error) {
      throw error;
    }

    // Format response
    const formattedLots = (lots || []).map(lot => ({
      id: lot.id,
      wallet_id: lot.wallet_id,
      wallet_name: lot.wallets?.name,
      transaction_id: lot.transaction_id,
      asset: lot.asset,
      amount: lot.amount,
      txid: lot.txid,
      vout: lot.vout,
      acquisition_date: lot.acquisition_date,
      acquisition_price_usd: lot.acquisition_price_usd,
      cost_basis_usd: lot.cost_basis_usd,
      acquisition_type: lot.acquisition_type,
      is_cost_basis_override: lot.is_cost_basis_override,
      cost_basis_notes: lot.cost_basis_notes,
      is_disposed: lot.is_disposed,
      disposal_date: lot.disposal_date,
      disposal_price_usd: lot.disposal_price_usd,
      proceeds_usd: lot.proceeds_usd,
      gain_loss_usd: lot.gain_loss_usd,
      is_long_term: lot.is_long_term,
      created_at: lot.created_at,
      updated_at: lot.updated_at,
    }));

    logApiRequest({
      apiKeyId: apiKey.id,
      userId: user.id,
      endpoint: '/api/v1/tax-lots',
      method: 'GET',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return apiSuccess(formattedLots, {
      meta: paginationMeta(count || 0, page, perPage),
      rateLimit,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logApiRequest({
      apiKeyId: apiKey.id,
      userId: user.id,
      endpoint: '/api/v1/tax-lots',
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
