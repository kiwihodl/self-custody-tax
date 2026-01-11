// GET /api/v1/tax/summary - Get tax summary for a year
// Public API endpoint for Advisor tier users

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateApiKey } from '@/lib/api/auth';
import { checkRateLimit, logApiRequest } from '@/lib/api/rate-limit';
import { apiSuccess, apiErrorFromCode, API_ERRORS } from '@/lib/api/response';

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
      endpoint: '/api/v1/tax/summary',
      method: 'GET',
      statusCode: 429,
      responseTimeMs: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      errorMessage: 'Rate limit exceeded',
    });

    return apiErrorFromCode(API_ERRORS.RATE_LIMITED, { rateLimit });
  }

  // Get required year parameter
  const yearParam = searchParams.get('year');
  if (!yearParam) {
    return apiErrorFromCode(API_ERRORS.MISSING_PARAM, {
      message: 'Missing required parameter: year',
      details: { parameter: 'year' },
      rateLimit,
    });
  }

  const year = parseInt(yearParam, 10);
  if (isNaN(year) || year < 2009 || year > new Date().getFullYear() + 1) {
    return apiErrorFromCode(API_ERRORS.INVALID_PARAM, {
      message: 'Invalid year parameter',
      details: { parameter: 'year', value: yearParam },
      rateLimit,
    });
  }

  const method = (searchParams.get('method')?.toUpperCase() || 'FIFO') as 'FIFO' | 'LIFO' | 'HIFO';

  try {
    const supabase = await createClient();

    // Get disposed tax lots for the year
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    const { data: disposedLots, error: lotsError } = await supabase
      .from('tax_lots')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_disposed', true)
      .gte('disposal_date', startOfYear)
      .lte('disposal_date', endOfYear);

    if (lotsError) {
      throw lotsError;
    }

    // Calculate short-term vs long-term
    const shortTerm = {
      proceeds: 0,
      cost_basis: 0,
      gain_loss: 0,
      transaction_count: 0,
    };

    const longTerm = {
      proceeds: 0,
      cost_basis: 0,
      gain_loss: 0,
      transaction_count: 0,
    };

    (disposedLots || []).forEach(lot => {
      const bucket = lot.is_long_term ? longTerm : shortTerm;
      bucket.proceeds += parseFloat(lot.proceeds_usd || '0');
      bucket.cost_basis += parseFloat(lot.cost_basis_usd || '0');
      bucket.gain_loss += parseFloat(lot.gain_loss_usd || '0');
      bucket.transaction_count += 1;
    });

    // Get income transactions for the year
    const { data: incomeTxs, error: incomeError } = await supabase
      .from('tax_lots')
      .select('*')
      .eq('user_id', user.id)
      .in('acquisition_type', ['income', 'mining', 'interest', 'airdrop'])
      .gte('acquisition_date', startOfYear)
      .lte('acquisition_date', endOfYear);

    if (incomeError) {
      throw incomeError;
    }

    const incomeByType: Record<string, number> = {};
    let totalIncome = 0;

    (incomeTxs || []).forEach(tx => {
      const amount = parseFloat(tx.cost_basis_usd || '0');
      const type = tx.acquisition_type;
      incomeByType[type] = (incomeByType[type] || 0) + amount;
      totalIncome += amount;
    });

    // Get total fees paid in the year
    const { data: feeData } = await supabase
      .from('transactions')
      .select('fee_usd')
      .eq('user_id', user.id)
      .gte('block_timestamp', startOfYear)
      .lte('block_timestamp', endOfYear);

    const feesPaid = (feeData || []).reduce(
      (sum, tx) => sum + (parseFloat(tx.fee_usd || '0')),
      0
    );

    const summary = {
      year,
      method,
      short_term: {
        proceeds: Math.round(shortTerm.proceeds * 100) / 100,
        cost_basis: Math.round(shortTerm.cost_basis * 100) / 100,
        gain_loss: Math.round(shortTerm.gain_loss * 100) / 100,
        transaction_count: shortTerm.transaction_count,
      },
      long_term: {
        proceeds: Math.round(longTerm.proceeds * 100) / 100,
        cost_basis: Math.round(longTerm.cost_basis * 100) / 100,
        gain_loss: Math.round(longTerm.gain_loss * 100) / 100,
        transaction_count: longTerm.transaction_count,
      },
      income: {
        total: Math.round(totalIncome * 100) / 100,
        by_type: Object.fromEntries(
          Object.entries(incomeByType).map(([k, v]) => [k, Math.round(v * 100) / 100])
        ),
      },
      fees_paid: Math.round(feesPaid * 100) / 100,
      total_gain_loss: Math.round((shortTerm.gain_loss + longTerm.gain_loss) * 100) / 100,
      total_disposals: shortTerm.transaction_count + longTerm.transaction_count,
    };

    logApiRequest({
      apiKeyId: apiKey.id,
      userId: user.id,
      endpoint: '/api/v1/tax/summary',
      method: 'GET',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return apiSuccess(summary, { rateLimit });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logApiRequest({
      apiKeyId: apiKey.id,
      userId: user.id,
      endpoint: '/api/v1/tax/summary',
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
