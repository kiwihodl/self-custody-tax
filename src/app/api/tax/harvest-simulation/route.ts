import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchCurrentPrice } from "@/lib/prices";
import BigNumber from "bignumber.js";

// Federal tax brackets for 2025/2026 - kept for future reference
// Short-term gains are taxed as ordinary income at marginal rates: 10%, 12%, 22%, 24%, 32%, 35%, 37%
// Long-term gains are taxed at preferential rates: 0%, 15%, 20%

export interface HarvestLot {
  id: string;
  walletId: string;
  walletName: string;
  amount: string;
  acquisitionDate: string;
  costBasisUsd: number;
  currentValueUsd: number;
  unrealizedLoss: number; // Negative = loss, positive = gain
  holdingPeriod: number;
  isLongTerm: boolean;
}

export interface HarvestSimulationRequest {
  lotIds: string[];
  taxBracket: number; // User's marginal tax rate (e.g., 0.24 for 24%)
  realizedGainsYtd?: number; // Already realized gains this year
}

export interface HarvestSimulationResult {
  selectedLots: HarvestLot[];
  summary: {
    totalLossToHarvest: number;
    shortTermLosses: number;
    longTermLosses: number;
    estimatedTaxSavings: number;
    realizedGainsYtd: number;
    netGainLossAfterHarvest: number;
  };
  washSaleWarning: {
    show: boolean;
    message: string;
    educationalNote: string;
  };
}

export interface HarvestableLotsResponse {
  currentBtcPrice: number;
  realizedGainsYtd: number;
  shortTermRealizedGains: number;
  longTermRealizedGains: number;
  harvestableLots: HarvestLot[];
  totalHarvestableLoss: number;
}

// GET: Fetch all lots with unrealized losses (harvestable)
export async function GET() {
  try {
    const supabase = await createClient();

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

    // Get YTD realized gains for context
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;

    const { data: disposedLots } = await supabase
      .from("tax_lots")
      .select("gain_loss_usd, is_long_term, disposal_date")
      .eq("user_id", user.id)
      .eq("is_disposed", true)
      .gte("disposal_date", yearStart);

    let shortTermRealizedGains = 0;
    let longTermRealizedGains = 0;

    if (disposedLots) {
      disposedLots.forEach((lot) => {
        const gainLoss = lot.gain_loss_usd || 0;
        if (lot.is_long_term) {
          longTermRealizedGains += gainLoss;
        } else {
          shortTermRealizedGains += gainLoss;
        }
      });
    }

    const realizedGainsYtd = shortTermRealizedGains + longTermRealizedGains;

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

    // Filter to only lots with unrealized losses
    const harvestableLots: HarvestLot[] = [];
    let totalHarvestableLoss = 0;

    (lots || []).forEach((lot) => {
      const amount = new BigNumber(lot.amount);
      const amountNum = amount.toNumber();
      const costBasis = lot.cost_basis_usd;
      const currentValue = amountNum * currentPrice;
      const unrealizedLoss = currentValue - costBasis;

      // Only include lots with losses (negative unrealized gain)
      if (unrealizedLoss < 0) {
        const acquisitionDate = new Date(lot.acquisition_date);
        const holdingPeriod = Math.floor(
          (now.getTime() - acquisitionDate.getTime()) / (24 * 60 * 60 * 1000)
        );
        const isLongTerm = now.getTime() - acquisitionDate.getTime() > oneYearMs;

        harvestableLots.push({
          id: lot.id,
          walletId: lot.wallet_id,
          walletName: walletMap.get(lot.wallet_id) || "Unknown",
          amount: lot.amount,
          acquisitionDate: lot.acquisition_date,
          costBasisUsd: costBasis,
          currentValueUsd: currentValue,
          unrealizedLoss,
          holdingPeriod,
          isLongTerm,
        });

        totalHarvestableLoss += unrealizedLoss;
      }
    });

    // Sort by loss amount (largest losses first - most negative)
    harvestableLots.sort((a, b) => a.unrealizedLoss - b.unrealizedLoss);

    const response: HarvestableLotsResponse = {
      currentBtcPrice: currentPrice,
      realizedGainsYtd,
      shortTermRealizedGains,
      longTermRealizedGains,
      harvestableLots,
      totalHarvestableLoss,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Harvest simulation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch" },
      { status: 500 }
    );
  }
}

// POST: Simulate harvesting selected lots
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: HarvestSimulationRequest = await request.json();
    const { lotIds, taxBracket, realizedGainsYtd = 0 } = body;

    if (!lotIds || lotIds.length === 0) {
      return NextResponse.json(
        { error: "No lots selected" },
        { status: 400 }
      );
    }

    // Validate tax bracket (10% to 37%)
    const validBracket = Math.max(0.10, Math.min(0.37, taxBracket));

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

    // Fetch selected lots
    const { data: lots, error: lotsError } = await supabase
      .from("tax_lots")
      .select("*")
      .eq("user_id", user.id)
      .in("id", lotIds);

    if (lotsError || !lots) {
      console.error("Failed to fetch selected lots:", lotsError);
      return NextResponse.json(
        { error: "Failed to fetch selected lots" },
        { status: 500 }
      );
    }

    const now = new Date();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;

    let shortTermLosses = 0;
    let longTermLosses = 0;
    const selectedLots: HarvestLot[] = [];

    lots.forEach((lot) => {
      const amount = new BigNumber(lot.amount);
      const amountNum = amount.toNumber();
      const costBasis = lot.cost_basis_usd;
      const currentValue = amountNum * currentPrice;
      const unrealizedLoss = currentValue - costBasis;

      const acquisitionDate = new Date(lot.acquisition_date);
      const holdingPeriod = Math.floor(
        (now.getTime() - acquisitionDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      const isLongTerm = now.getTime() - acquisitionDate.getTime() > oneYearMs;

      // Only count losses (negative values)
      if (unrealizedLoss < 0) {
        if (isLongTerm) {
          longTermLosses += unrealizedLoss;
        } else {
          shortTermLosses += unrealizedLoss;
        }
      }

      selectedLots.push({
        id: lot.id,
        walletId: lot.wallet_id,
        walletName: walletMap.get(lot.wallet_id) || "Unknown",
        amount: lot.amount,
        acquisitionDate: lot.acquisition_date,
        costBasisUsd: costBasis,
        currentValueUsd: currentValue,
        unrealizedLoss,
        holdingPeriod,
        isLongTerm,
      });
    });

    const totalLossToHarvest = shortTermLosses + longTermLosses;

    // Calculate estimated tax savings
    // Short-term losses offset short-term gains at marginal rate
    // Long-term losses offset long-term gains at long-term rate (usually 15%)
    // Losses can offset up to $3,000 of ordinary income if gains exhausted
    const shortTermSavings = Math.abs(shortTermLosses) * validBracket;
    const longTermSavings = Math.abs(longTermLosses) * 0.15; // Assume 15% LTCG rate
    const estimatedTaxSavings = shortTermSavings + longTermSavings;

    // Net position after harvest
    const netGainLossAfterHarvest = realizedGainsYtd + totalLossToHarvest;

    const result: HarvestSimulationResult = {
      selectedLots,
      summary: {
        totalLossToHarvest,
        shortTermLosses,
        longTermLosses,
        estimatedTaxSavings,
        realizedGainsYtd,
        netGainLossAfterHarvest,
      },
      washSaleWarning: {
        show: true,
        message:
          "If you repurchase substantially identical assets within 30 days, the wash sale rule may apply.",
        educationalNote:
          "Note: As of 2026, the wash sale rule does not officially apply to cryptocurrency under current IRS guidance. However, legislation is pending and best practice is to wait 31 days before repurchasing the same asset. This is educational information only and not tax advice.",
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Harvest simulation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Simulation failed" },
      { status: 500 }
    );
  }
}
