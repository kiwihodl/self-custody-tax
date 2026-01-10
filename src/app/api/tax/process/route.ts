/**
 * Tax lot processing API endpoint
 *
 * POST /api/tax/process
 *   - Processes all wallets for the authenticated user
 *   - Creates tax lots for receive transactions
 *   - Processes disposals for send transactions (FIFO/LIFO/HIFO)
 *   - Fetches historical prices from CoinGecko (server-side, no CORS)
 *
 * Tax calculation logic:
 *   - Short-term gains: Held <= 1 year (taxed as ordinary income)
 *   - Long-term gains: Held > 1 year (preferential tax rates)
 *   - Determination based on acquisition_date vs disposal_date
 *   - Currently implements US federal rules only
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createTaxLotsForWallet, processSendTransactions } from "@/lib/tax/lots";

export async function POST(request: NextRequest) {
  try {
    // Use request.cookies directly (same pattern as middleware)
    const allCookies = request.cookies.getAll();
    console.log("[TaxProcess] Available cookies:", allCookies.map(c => c.name));

    let response = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("[TaxProcess] Auth check - user:", user?.id, "error:", authError?.message);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Session expired. Please refresh the page." },
        { status: 401 }
      );
    }

    // Parse request body for method
    let method: "FIFO" | "LIFO" | "HIFO" = "FIFO";
    try {
      const body = await request.json();
      if (body.method && ["FIFO", "LIFO", "HIFO"].includes(body.method)) {
        method = body.method;
      }
    } catch {
      // Default to FIFO if no body
    }

    // Get all user's wallets
    const { data: wallets, error: walletsError } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_deleted", false);

    if (walletsError) {
      return NextResponse.json(
        { error: "Failed to fetch wallets" },
        { status: 500 }
      );
    }

    if (!wallets || wallets.length === 0) {
      return NextResponse.json(
        { error: "No wallets found" },
        { status: 404 }
      );
    }

    let totalCreated = 0;
    let totalProcessed = 0;
    const errors: string[] = [];

    // Process each wallet
    for (const wallet of wallets) {
      // Create tax lots for receive transactions
      const createResult = await createTaxLotsForWallet(supabase, wallet.id);
      totalCreated += createResult.created;
      errors.push(...createResult.errors);

      // Process send transactions (disposals)
      const processResult = await processSendTransactions(
        supabase,
        wallet.id,
        method
      );
      totalProcessed += processResult.processed;
      errors.push(...processResult.errors);
    }

    return NextResponse.json({
      success: true,
      created: totalCreated,
      processed: totalProcessed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[TaxProcess] Error:", error);
    return NextResponse.json(
      { error: "Failed to process tax lots" },
      { status: 500 }
    );
  }
}
