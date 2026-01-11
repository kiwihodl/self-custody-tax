import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { bulkSyncClients } from '@/lib/advisor/bulk';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify advisor tier
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile || profile.subscription_tier !== 'advisor') {
      return NextResponse.json(
        { error: 'Advisor tier required for bulk operations' },
        { status: 403 }
      );
    }

    // Parse request
    const body = await request.json();
    const { clientIds } = body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json(
        { error: 'clientIds array is required' },
        { status: 400 }
      );
    }

    // Limit bulk operations
    if (clientIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 clients per bulk operation' },
        { status: 400 }
      );
    }

    // Get request info for audit
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Execute bulk sync
    const result = await bulkSyncClients(user.id, clientIds, {
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Bulk sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bulk sync failed' },
      { status: 500 }
    );
  }
}
