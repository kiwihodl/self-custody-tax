// API Key Management Endpoints
// GET - List API keys
// POST - Create new API key
// These are authenticated via Supabase session (not API key)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createApiKey, listApiKeys } from '@/lib/api/auth';

// GET /api/v1/keys - List all API keys for the user
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check if user is Advisor tier
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  if (!profile || profile.subscription_tier !== 'advisor') {
    return NextResponse.json(
      { error: 'API keys require Advisor tier subscription' },
      { status: 403 }
    );
  }

  const keys = await listApiKeys(user.id);

  return NextResponse.json({ data: keys });
}

// POST /api/v1/keys - Create a new API key
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { name, scopes = ['read'] } = body;

    if (!name || typeof name !== 'string' || name.length < 1) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: 'Name must be 50 characters or less' },
        { status: 400 }
      );
    }

    const result = await createApiKey(user.id, name.trim(), scopes);

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Return the full key only once - user must save it
    return NextResponse.json({
      data: {
        id: result.id,
        key: result.key,
        name: name.trim(),
        message: 'Save this key securely. It will not be shown again.',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
