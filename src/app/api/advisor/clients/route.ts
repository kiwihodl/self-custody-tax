// Advisor Clients API
// GET - List all clients
// POST - Invite a new client

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdvisorClients, getClientSummary, inviteClient } from '@/lib/advisor/clients';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is Advisor tier
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  if (!profile || profile.subscription_tier !== 'advisor') {
    return NextResponse.json(
      { error: 'Multi-client features require Advisor tier subscription' },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') as 'all' | 'active' | 'pending' | undefined;
  const search = searchParams.get('search') || undefined;

  try {
    const [clients, summary] = await Promise.all([
      getAdvisorClients(user.id, { status, search }),
      getClientSummary(user.id),
    ]);

    return NextResponse.json({
      data: {
        clients,
        summary,
      },
    });
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, permission_level, note } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (permission_level && !['view', 'manage'].includes(permission_level)) {
      return NextResponse.json(
        { error: 'Permission level must be "view" or "manage"' },
        { status: 400 }
      );
    }

    const result = await inviteClient(
      user.id,
      {
        email: email.trim(),
        permission_level: permission_level || 'view',
        note,
      },
      {
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: {
        message: 'Invitation sent successfully',
        // In production, don't return the token - it's sent via email
        // token: result.token,
      },
    });
  } catch (error) {
    console.error('Failed to invite client:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
