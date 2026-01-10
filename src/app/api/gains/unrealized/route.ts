import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchCurrentPrice } from "@/lib/prices";
import BigNumber from "bignumber.js";

export interface UnrealizedLot {
  id: string;
  walletId: string;
  walletName: string;
  amount: string;
  acquisitionDate: string;
  acquisitionPriceUsd: number;
  costBasisUsd: number;
  acquisitionType: string;
  currentValueUsd: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercent: number;
  holdingPeriod: number; // days
  isLongTerm: boolean;
  isCostBasisOverride: boolean;
  costBasisNotes?: string;
}

export interface UnrealizedGainsSummary {
  currentBtcPrice: number;
  totalBtc: number;
  totalCostBasis: number;
  totalCurrentValue: number;
  totalUnrealizedGainLoss: number;
  totalUnrealizedPercent: number;
  shortTermGainLoss: number;
  longTermGainLoss: number;
  lots: UnrealizedLot[];
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Get all undisposed tax lots for BTC
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

    let totalBtc = 0;
    let totalCostBasis = 0;
    let totalCurrentValue = 0;
    let shortTermGainLoss = 0;
    let longTermGainLoss = 0;

    const unrealizedLots: UnrealizedLot[] = (lots || []).map((lot) => {
      const amount = new BigNumber(lot.amount);
      const amountNum = amount.toNumber();
      const costBasis = lot.cost_basis_usd;
      const currentValue = amountNum * currentPrice;
      const unrealizedGainLoss = currentValue - costBasis;
      const unrealizedPercent = costBasis > 0 ? (unrealizedGainLoss / costBasis) * 100 : 0;

      const acquisitionDate = new Date(lot.acquisition_date);
      const holdingPeriod = Math.floor((now.getTime() - acquisitionDate.getTime()) / (24 * 60 * 60 * 1000));
      const isLongTerm = now.getTime() - acquisitionDate.getTime() > oneYearMs;

      totalBtc += amountNum;
      totalCostBasis += costBasis;
      totalCurrentValue += currentValue;

      if (isLongTerm) {
        longTermGainLoss += unrealizedGainLoss;
      } else {
        shortTermGainLoss += unrealizedGainLoss;
      }

      return {
        id: lot.id,
        walletId: lot.wallet_id,
        walletName: walletMap.get(lot.wallet_id) || "Unknown",
        amount: lot.amount,
        acquisitionDate: lot.acquisition_date,
        acquisitionPriceUsd: lot.acquisition_price_usd,
        costBasisUsd: costBasis,
        acquisitionType: lot.acquisition_type,
        currentValueUsd: currentValue,
        unrealizedGainLoss,
        unrealizedGainLossPercent: unrealizedPercent,
        holdingPeriod,
        isLongTerm,
        isCostBasisOverride: lot.is_cost_basis_override || false,
        costBasisNotes: lot.cost_basis_notes,
      };
    });

    const totalUnrealizedGainLoss = totalCurrentValue - totalCostBasis;
    const totalUnrealizedPercent = totalCostBasis > 0 ? (totalUnrealizedGainLoss / totalCostBasis) * 100 : 0;

    const summary: UnrealizedGainsSummary = {
      currentBtcPrice: currentPrice,
      totalBtc,
      totalCostBasis,
      totalCurrentValue,
      totalUnrealizedGainLoss,
      totalUnrealizedPercent,
      shortTermGainLoss,
      longTermGainLoss,
      lots: unrealizedLots,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Unrealized gains error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to calculate" },
      { status: 500 }
    );
  }
}
