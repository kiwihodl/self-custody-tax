// API Key Authentication for Public API
// Only available for Advisor tier users

import { createHash, randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export interface ApiKeyData {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_daily: number;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiAuthResult {
  success: true;
  user: {
    id: string;
    email: string;
    subscription_tier: string;
  };
  apiKey: ApiKeyData;
}

export interface ApiAuthError {
  success: false;
  error: string;
  status: number;
}

export type ApiAuthResponse = ApiAuthResult | ApiAuthError;

/**
 * Generate a new API key
 * Format: sct_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (40 chars total)
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const randomPart = randomBytes(24).toString('hex'); // 48 chars
  const key = `sct_live_${randomPart.slice(0, 32)}`;
  const hash = createHash('sha256').update(key).digest('hex');
  const prefix = key.slice(0, 8); // "sct_live"

  return { key, hash, prefix };
}

/**
 * Hash an API key for storage/comparison
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Validate API key from request headers
 * Returns user and API key data if valid, error if invalid
 */
export async function validateApiKey(request: NextRequest): Promise<ApiAuthResponse> {
  const authHeader = request.headers.get('Authorization');

  // Check for Authorization header
  if (!authHeader) {
    return {
      success: false,
      error: 'Missing Authorization header. Use: Authorization: Bearer <api_key>',
      status: 401,
    };
  }

  // Check for Bearer token format
  if (!authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Invalid Authorization format. Use: Authorization: Bearer <api_key>',
      status: 401,
    };
  }

  const apiKey = authHeader.slice(7).trim();

  // Validate key format
  if (!apiKey.startsWith('sct_live_') || apiKey.length < 40) {
    return {
      success: false,
      error: 'Invalid API key format',
      status: 401,
    };
  }

  const keyHash = hashApiKey(apiKey);
  const keyPrefix = apiKey.slice(0, 8);

  const supabase = await createClient();

  // Look up API key
  const { data: keyData, error: keyError } = await supabase
    .from('api_keys')
    .select(`
      id,
      user_id,
      name,
      key_prefix,
      scopes,
      rate_limit_daily,
      last_used_at,
      expires_at,
      is_revoked,
      created_at
    `)
    .eq('key_hash', keyHash)
    .eq('key_prefix', keyPrefix)
    .single();

  if (keyError || !keyData) {
    return {
      success: false,
      error: 'Invalid API key',
      status: 401,
    };
  }

  // Check if key is revoked
  if (keyData.is_revoked) {
    return {
      success: false,
      error: 'API key has been revoked',
      status: 401,
    };
  }

  // Check if key is expired
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return {
      success: false,
      error: 'API key has expired',
      status: 401,
    };
  }

  // Get user profile
  const { data: userData, error: userError } = await supabase
    .from('user_profiles')
    .select('id, email, subscription_tier')
    .eq('id', keyData.user_id)
    .single();

  if (userError || !userData) {
    return {
      success: false,
      error: 'User account not found',
      status: 401,
    };
  }

  // Check subscription tier
  if (userData.subscription_tier !== 'advisor') {
    return {
      success: false,
      error: 'API access requires Advisor tier subscription. Upgrade at /pricing',
      status: 403,
    };
  }

  // Update last used timestamp (fire and forget)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyData.id)
    .then(() => {});

  return {
    success: true,
    user: {
      id: userData.id,
      email: userData.email,
      subscription_tier: userData.subscription_tier,
    },
    apiKey: {
      id: keyData.id,
      user_id: keyData.user_id,
      name: keyData.name,
      key_prefix: keyData.key_prefix,
      scopes: keyData.scopes,
      rate_limit_daily: keyData.rate_limit_daily,
      last_used_at: keyData.last_used_at,
      created_at: keyData.created_at,
    },
  };
}

/**
 * Check if API key has a specific scope
 */
export function hasScope(apiKey: ApiKeyData, scope: string): boolean {
  return apiKey.scopes.includes(scope) || apiKey.scopes.includes('*');
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(
  userId: string,
  name: string,
  scopes: string[] = ['read']
): Promise<{ key: string; id: string } | { error: string }> {
  const supabase = await createClient();

  // Verify user is Advisor tier
  const { data: user } = await supabase
    .from('user_profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  if (!user || user.subscription_tier !== 'advisor') {
    return { error: 'API keys require Advisor tier subscription' };
  }

  // Check existing key count (limit to 5 per user)
  const { count } = await supabase
    .from('api_keys')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_revoked', false);

  if (count && count >= 5) {
    return { error: 'Maximum 5 active API keys per account' };
  }

  // Generate new key
  const { key, hash, prefix } = generateApiKey();

  // Insert into database
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      name,
      key_hash: hash,
      key_prefix: prefix,
      scopes,
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  return { key, id: data.id };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  userId: string,
  keyId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('api_keys')
    .update({ is_revoked: true })
    .eq('id', keyId)
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * List all API keys for a user (without the actual key, just metadata)
 */
export async function listApiKeys(userId: string): Promise<ApiKeyData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('api_keys')
    .select(`
      id,
      user_id,
      name,
      key_prefix,
      scopes,
      rate_limit_daily,
      last_used_at,
      created_at
    `)
    .eq('user_id', userId)
    .eq('is_revoked', false)
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }

  return data || [];
}
