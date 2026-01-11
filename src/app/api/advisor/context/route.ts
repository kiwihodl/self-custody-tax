// Advisor Context API
// POST - Enter client view mode
// DELETE - Exit client view mode
// GET - Get current context

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  enterClientContext,
  exitClientContext,
  getClientContext,
} from '@/lib/advisor/context';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const context = await getClientContext();

  return NextResponse.json({
    data: {
      isViewingClient: context !== null,
      context,
    },
  });
}

export async function POST(request: NextRequest) {
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
      { error: 'Advisor tier required' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    const result = await enterClientContext(user.id, clientId, {
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      data: {
        message: 'Entered client view mode',
        context: result.context,
      },
    });
  } catch (error) {
    console.error('Failed to enter client context:', error);
    return NextResponse.json(
      { error: 'Failed to enter client view mode' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await exitClientContext(user.id, {
    ipAddress: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  });

  return NextResponse.json({
    data: { message: 'Exited client view mode' },
  });
}
