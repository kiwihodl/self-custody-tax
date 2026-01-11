// GET /api/v1/transactions - List transactions
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
      endpoint: '/api/v1/transactions',
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
    const category = searchParams.get('category');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const network = searchParams.get('network');

    // Build query
    let query = supabase
      .from('transactions')
      .select('*, wallets!inner(name, network)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('block_timestamp', { ascending: false, nullsFirst: false });

    if (walletId) {
      query = query.eq('wallet_id', walletId);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (network) {
      query = query.eq('network', network);
    }

    if (startDate) {
      query = query.gte('block_timestamp', startDate);
    }

    if (endDate) {
      query = query.lte('block_timestamp', endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + perPage - 1);

    const { data: transactions, error, count } = await query;

    if (error) {
      throw error;
    }

    // Format response
    const formattedTransactions = (transactions || []).map(tx => {
      // Calculate amount from inputs/outputs for Bitcoin
      let amount = tx.amount;
      const amountUsd = tx.amount_usd || 0;

      if (tx.network === 'bitcoin' && tx.outputs) {
        const outputs = tx.outputs as Array<{ value_sats: number; is_ours: boolean }>;
        const ourOutputs = outputs.filter(o => o.is_ours);
        const satoshis = ourOutputs.reduce((sum, o) => sum + (o.value_sats || 0), 0);
        amount = (satoshis / 100_000_000).toFixed(8);
      }

      return {
        id: tx.id,
        txid: tx.txid,
        wallet_id: tx.wallet_id,
        wallet_name: tx.wallets?.name,
        network: tx.network,
        category: tx.category,
        amount,
        amount_usd: amountUsd,
        fee: tx.fee,
        fee_usd: tx.fee_usd,
        from_address: tx.from_address,
        to_address: tx.to_address,
        block_height: tx.block_height,
        block_timestamp: tx.block_timestamp,
        is_internal_transfer: tx.is_internal_transfer,
        linked_transaction_id: tx.linked_transaction_id,
        notes: tx.notes,
        created_at: tx.created_at,
      };
    });

    logApiRequest({
      apiKeyId: apiKey.id,
      userId: user.id,
      endpoint: '/api/v1/transactions',
      method: 'GET',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return apiSuccess(formattedTransactions, {
      meta: paginationMeta(count || 0, page, perPage),
      rateLimit,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logApiRequest({
      apiKeyId: apiKey.id,
      userId: user.id,
      endpoint: '/api/v1/transactions',
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
