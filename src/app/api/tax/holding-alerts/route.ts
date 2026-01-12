import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchCurrentPrice } from "@/lib/prices";
import BigNumber from "bignumber.js";

export interface ApproachingLot {
  id: string;
  walletId: string;
  walletName: string;
  amount: string;
  acquisitionDate: string;
  daysUntilLongTerm: number;
  longTermDate: string;
  costBasisUsd: number;
  currentValueUsd: number;
  unrealizedGainLoss: number;
}

export interface HoldingAlertsResponse {
  currentBtcPrice: number;
  approachingLots: ApproachingLot[];
  recentlyLongTerm: ApproachingLot[];
  totalApproachingValue: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get threshold from query params (default 30 days)
    const searchParams = request.nextUrl.searchParams;
    const threshold = parseInt(searchParams.get("threshold") || "30", 10);

    // Fetch current BTC price
    const currentPrice = await fetchCurrentPrice("BTC");
    if (!currentPrice) {
      return NextResponse.json(
        { error: "Failed to fetch current BTC price" },
        { status: 500 }
      );
    }

    // Get user's wallets for names
    const { data: wallets } = await supabase
      .from("wallets")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_deleted", false);

    const walletMap = new Map<string, string>();
    if (wallets) {
      wallets.forEach((w) => walletMap.set(w.id, w.name));
    }

    // Get all undisposed tax lots
    const { data: lots, error: lotsError } = await supabase
      .from("tax_lots")
      .select("*")
      .eq("user_id", user.id)
      .eq("asset", "BTC")
      .eq("is_disposed", false)
      .order("acquisition_date", { ascending: true });

    if (lotsError) {
      console.error("Failed to fetch tax lots:", lotsError);
      return NextResponse.json(
        { error: "Failed to fetch holdings" },
        { status: 500 }
      );
    }

    const now = new Date();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;

    const approachingLots: ApproachingLot[] = [];
    const recentlyLongTerm: ApproachingLot[] = [];
    let totalApproachingValue = 0;

    (lots || []).forEach((lot) => {
      const amount = new BigNumber(lot.amount);
      const amountNum = amount.toNumber();
      const costBasis = lot.cost_basis_usd;
      const currentValue = amountNum * currentPrice;
      const unrealizedGainLoss = currentValue - costBasis;

      const acquisitionDate = new Date(lot.acquisition_date);
      const longTermDate = new Date(acquisitionDate.getTime() + oneYearMs);
      const msUntilLongTerm = longTermDate.getTime() - now.getTime();
      const daysUntilLongTerm = Math.ceil(msUntilLongTerm / oneDay);

      // Already long-term, check if recently became long-term (last 7 days)
      if (daysUntilLongTerm <= 0) {
        if (daysUntilLongTerm >= -7) {
          recentlyLongTerm.push({
            id: lot.id,
            walletId: lot.wallet_id,
            walletName: walletMap.get(lot.wallet_id) || "Unknown",
            amount: lot.amount,
            acquisitionDate: lot.acquisition_date,
            daysUntilLongTerm,
            longTermDate: longTermDate.toISOString(),
            costBasisUsd: costBasis,
            currentValueUsd: currentValue,
            unrealizedGainLoss,
          });
        }
        return; // Skip lots already long-term
      }

      // Check if approaching long-term within threshold
      if (daysUntilLongTerm <= threshold) {
        approachingLots.push({
          id: lot.id,
          walletId: lot.wallet_id,
          walletName: walletMap.get(lot.wallet_id) || "Unknown",
          amount: lot.amount,
          acquisitionDate: lot.acquisition_date,
          daysUntilLongTerm,
          longTermDate: longTermDate.toISOString(),
          costBasisUsd: costBasis,
          currentValueUsd: currentValue,
          unrealizedGainLoss,
        });

        totalApproachingValue += currentValue;
      }
    });

    // Sort by days until long-term (soonest first)
    approachingLots.sort((a, b) => a.daysUntilLongTerm - b.daysUntilLongTerm);
    recentlyLongTerm.sort((a, b) => b.daysUntilLongTerm - a.daysUntilLongTerm);

    const response: HoldingAlertsResponse = {
      currentBtcPrice: currentPrice,
      approachingLots,
      recentlyLongTerm,
      totalApproachingValue,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Holding alerts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch" },
      { status: 500 }
    );
  }
}
