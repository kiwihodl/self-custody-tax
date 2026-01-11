import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateTaxReportPDF } from '@/lib/reports';
import type { AdvisorProfile } from '@/lib/advisor/types';
import type { TaxReportData, TaxLotEntry } from '@/lib/reports';

interface RequestBody {
  year?: number;
  method?: 'FIFO' | 'LIFO' | 'HIFO';
  clientId?: string;
}

// POST /api/advisor/reports/branded - Generate branded PDF report
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: RequestBody = await request.json();
    const year = body.year || new Date().getFullYear();
    const method = body.method || 'FIFO';

    // Determine if this is for a client or the user themselves
    let targetUserId = user.id;
    let clientName = 'Self';

    // Check if advisor is generating for a client
    if (body.clientId) {
      // Verify advisor tier
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      if (!profile || profile.subscription_tier !== 'advisor') {
        return NextResponse.json(
          { error: 'Advisor tier required for client reports' },
          { status: 403 }
        );
      }

      // Verify access to this client
      const { data: clientRelation } = await supabase
        .from('advisor_clients')
        .select('client_id, client_email')
        .eq('advisor_id', user.id)
        .eq('client_id', body.clientId)
        .eq('status', 'active')
        .single();

      if (!clientRelation) {
        return NextResponse.json(
          { error: 'Client not found or not authorized' },
          { status: 404 }
        );
      }

      targetUserId = body.clientId;

      // Get client profile for name
      const { data: clientProfile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', body.clientId)
        .single();

      clientName =
        clientProfile?.full_name ||
        clientRelation.client_email.split('@')[0] ||
        'Client';
    } else {
      // Get user's own profile
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      clientName = userProfile?.full_name || user.email?.split('@')[0] || 'User';
    }

    // Get advisor branding if advisor tier
    let branding: AdvisorProfile | null = null;
    const { data: userProfileTier } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (userProfileTier?.subscription_tier === 'advisor') {
      const { data: advisorProfile } = await supabase
        .from('advisor_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      branding = advisorProfile as AdvisorProfile | null;
    }

    // Fetch tax lots for the report
    const { data: taxLots, error: taxLotsError } = await supabase
      .from('tax_lots')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('is_disposed', true)
      .gte('disposal_date', `${year}-01-01`)
      .lte('disposal_date', `${year}-12-31`)
      .order('disposal_date', { ascending: true });

    if (taxLotsError) {
      console.error('Error fetching tax lots:', taxLotsError);
      return NextResponse.json(
        { error: 'Failed to fetch tax data' },
        { status: 500 }
      );
    }

    // Process tax lots into report format
    const transactions: TaxLotEntry[] = (taxLots || []).map((lot) => {
      const acquisitionDate = new Date(lot.acquisition_date);
      const disposalDate = new Date(lot.disposal_date);
      const daysHeld =
        (disposalDate.getTime() - acquisitionDate.getTime()) /
        (1000 * 60 * 60 * 24);
      const holdingPeriod: 'short' | 'long' = daysHeld > 365 ? 'long' : 'short';

      return {
        asset: lot.asset || 'BTC',
        amount: parseFloat(lot.amount) || 0,
        acquisitionDate: lot.acquisition_date,
        disposalDate: lot.disposal_date,
        proceeds: parseFloat(lot.proceeds_usd) || 0,
        costBasis: parseFloat(lot.cost_basis_usd) || 0,
        gainLoss:
          (parseFloat(lot.proceeds_usd) || 0) -
          (parseFloat(lot.cost_basis_usd) || 0),
        holdingPeriod,
      };
    });

    // Calculate summary totals
    let shortTermGains = 0;
    let shortTermLosses = 0;
    let longTermGains = 0;
    let longTermLosses = 0;
    let totalProceeds = 0;
    let totalCostBasis = 0;

    for (const tx of transactions) {
      totalProceeds += tx.proceeds;
      totalCostBasis += tx.costBasis;

      if (tx.holdingPeriod === 'short') {
        if (tx.gainLoss >= 0) {
          shortTermGains += tx.gainLoss;
        } else {
          shortTermLosses += Math.abs(tx.gainLoss);
        }
      } else {
        if (tx.gainLoss >= 0) {
          longTermGains += tx.gainLoss;
        } else {
          longTermLosses += Math.abs(tx.gainLoss);
        }
      }
    }

    const reportData: TaxReportData = {
      year,
      method,
      shortTermGains,
      shortTermLosses,
      longTermGains,
      longTermLosses,
      netGainLoss:
        shortTermGains -
        shortTermLosses +
        longTermGains -
        longTermLosses,
      totalProceeds,
      totalCostBasis,
      transactions,
    };

    // Generate PDF
    const pdfBuffer = await generateTaxReportPDF({
      branding,
      data: reportData,
      clientName,
      reportTitle: `Tax Report ${year}`,
    });

    // Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="tax-report-${year}-${method.toLowerCase()}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to generate report',
      },
      { status: 500 }
    );
  }
}

// GET /api/advisor/reports/branded/preview - Preview branded report
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify advisor tier
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_tier, full_name, email')
      .eq('id', user.id)
      .single();

    if (!profile || profile.subscription_tier !== 'advisor') {
      return NextResponse.json(
        { error: 'Advisor tier required for preview' },
        { status: 403 }
      );
    }

    // Get advisor branding
    const { data: advisorProfile } = await supabase
      .from('advisor_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Generate sample report data
    const sampleData: TaxReportData = {
      year: new Date().getFullYear(),
      method: 'FIFO',
      shortTermGains: 15234.56,
      shortTermLosses: 3456.78,
      longTermGains: 45678.9,
      longTermLosses: 1234.56,
      netGainLoss: 56222.12,
      totalProceeds: 125000.0,
      totalCostBasis: 68777.88,
      transactions: [
        {
          asset: 'BTC',
          amount: 0.5,
          acquisitionDate: '2024-03-15',
          disposalDate: '2025-06-20',
          proceeds: 32500.0,
          costBasis: 21000.0,
          gainLoss: 11500.0,
          holdingPeriod: 'long',
        },
        {
          asset: 'BTC',
          amount: 0.25,
          acquisitionDate: '2025-01-10',
          disposalDate: '2025-04-15',
          proceeds: 16250.0,
          costBasis: 14000.0,
          gainLoss: 2250.0,
          holdingPeriod: 'short',
        },
        {
          asset: 'BTC',
          amount: 0.1,
          acquisitionDate: '2025-02-28',
          disposalDate: '2025-05-30',
          proceeds: 6500.0,
          costBasis: 5800.0,
          gainLoss: 700.0,
          holdingPeriod: 'short',
        },
      ],
    };

    // Generate preview PDF
    const pdfBuffer = await generateTaxReportPDF({
      branding: advisorProfile as AdvisorProfile | null,
      data: sampleData,
      clientName: profile.full_name || 'Sample Client',
      reportTitle: `Tax Report ${new Date().getFullYear()} - PREVIEW`,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="preview-report.pdf"',
      },
    });
  } catch (error) {
    console.error('Preview generation error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to generate preview',
      },
      { status: 500 }
    );
  }
}
