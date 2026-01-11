import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { bulkGenerateReports, generateBulkReportsZip } from '@/lib/advisor/bulk';
import { logAdvisorAction, AuditActions } from '@/lib/advisor/audit';

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
    const { clientIds, year, method = 'FIFO', format = 'json' } = body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json(
        { error: 'clientIds array is required' },
        { status: 400 }
      );
    }

    if (!year || typeof year !== 'number') {
      return NextResponse.json(
        { error: 'year is required and must be a number' },
        { status: 400 }
      );
    }

    if (!['FIFO', 'LIFO', 'HIFO'].includes(method)) {
      return NextResponse.json(
        { error: 'method must be FIFO, LIFO, or HIFO' },
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

    // Execute bulk report generation
    const result = await bulkGenerateReports(
      user.id,
      clientIds,
      year,
      method as 'FIFO' | 'LIFO' | 'HIFO',
      { ipAddress, userAgent }
    );

    // If ZIP format requested, package files
    if (format === 'zip') {
      const files = await generateBulkReportsZip(result.results);

      // Log bulk download
      logAdvisorAction({
        advisorId: user.id,
        action: AuditActions.DOWNLOADED_BULK_REPORTS,
        category: 'report',
        details: {
          year,
          method,
          clientCount: clientIds.length,
          filesGenerated: files.length,
        },
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        data: {
          ...result,
          files,
        },
      });
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Bulk reports error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bulk report generation failed' },
      { status: 500 }
    );
  }
}
