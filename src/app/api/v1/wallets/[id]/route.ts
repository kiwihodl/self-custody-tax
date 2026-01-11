// GET /api/v1/wallets/:id - Get wallet details
// Public API endpoint for Advisor tier users

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateApiKey } from '@/lib/api/auth';
import { checkRateLimit, logApiRequest } from '@/lib/api/rate-limit';
import { apiSuccess, apiErrorFromCode, API_ERRORS } from '@/lib/api/response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

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
      endpoint: `/api/v1/wallets/${id}`,
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

    // Get wallet
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (error || !wallet) {
      logApiRequest({
        apiKeyId: apiKey.id,
        userId: user.id,
        endpoint: `/api/v1/wallets/${id}`,
        method: 'GET',
        statusCode: 404,
        responseTimeMs: Date.now() - startTime,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        errorMessage: 'Wallet not found',
      });

      return apiErrorFromCode(API_ERRORS.NOT_FOUND, {
        message: 'Wallet not found',
        rateLimit,
      });
    }

    // Get transaction count
    const { count: txCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('wallet_id', id);

    // Format response
    const formattedWallet = {
      id: wallet.id,
      name: wallet.name,
      type: wallet.type,
      network: wallet.network,
      balance: wallet.balance?.toString() || '0',
      balance_usd: wallet.balance_usd || 0,
      xpub: wallet.xpub ? `${wallet.xpub.slice(0, 20)}...` : null,
      address: wallet.address,
      derivation_path: wallet.derivation_path,
      multisig_config: wallet.multisig_config,
      transaction_count: txCount || 0,
      last_synced_at: wallet.last_synced_at,
      sync_status: wallet.sync_status,
      sync_error: wallet.sync_error,
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
    };

    logApiRequest({
      apiKeyId: apiKey.id,
      userId: user.id,
      endpoint: `/api/v1/wallets/${id}`,
      method: 'GET',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return apiSuccess(formattedWallet, { rateLimit });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logApiRequest({
      apiKeyId: apiKey.id,
      userId: user.id,
      endpoint: `/api/v1/wallets/${id}`,
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
