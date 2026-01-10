/**
 * Tax reporting - summaries and exports
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { TaxLot } from "./lots";

export interface TaxSummary {
  year: number;
  method: "FIFO" | "LIFO" | "HIFO";

  shortTerm: {
    proceeds: number;
    costBasis: number;
    gainLoss: number;
    transactionCount: number;
  };

  longTerm: {
    proceeds: number;
    costBasis: number;
    gainLoss: number;
    transactionCount: number;
  };

  income: {
    total: number;
    byType: Record<string, number>;
  };

  feesPaid: number;

  unrealizedGains: number;
  unrealizedCostBasis: number;
}

/**
 * Get disposed tax lots for a year
 */
export async function getDisposedLots(
  supabase: SupabaseClient,
  userId: string,
  year: number
): Promise<TaxLot[]> {
  const startDate = `${year}-01-01T00:00:00Z`;
  const endDate = `${year}-12-31T23:59:59Z`;

  const { data, error } = await supabase
    .from("tax_lots")
    .select("*")
    .eq("user_id", userId)
    .eq("is_disposed", true)
    .gte("disposal_date", startDate)
    .lte("disposal_date", endDate)
    .order("disposal_date", { ascending: true });

  if (error) {
    console.error(`[TaxReport] Error fetching disposed lots:`, error.message);
    return [];
  }

  return (data || []) as TaxLot[];
}

/**
 * Get undisposed (unrealized) tax lots
 */
async function getUnrealizedLots(
  supabase: SupabaseClient,
  userId: string
): Promise<TaxLot[]> {
  const { data, error } = await supabase
    .from("tax_lots")
    .select("*")
    .eq("user_id", userId)
    .eq("is_disposed", false);

  if (error) {
    console.error(`[TaxReport] Error fetching unrealized lots:`, error.message);
    return [];
  }

  return (data || []) as TaxLot[];
}

/**
 * Get income transactions for a year
 */
async function getIncomeTransactions(
  supabase: SupabaseClient,
  userId: string,
  year: number
): Promise<{ type: string; amount_usd: number }[]> {
  const startDate = `${year}-01-01T00:00:00Z`;
  const endDate = `${year}-12-31T23:59:59Z`;

  // Get tax lots that represent income (not purchases)
  const { data, error } = await supabase
    .from("tax_lots")
    .select("acquisition_type, cost_basis_usd")
    .eq("user_id", userId)
    .in("acquisition_type", ["income", "mining", "interest", "airdrop"])
    .gte("acquisition_date", startDate)
    .lte("acquisition_date", endDate);

  if (error) {
    console.error(`[TaxReport] Error fetching income:`, error.message);
    return [];
  }

  return (data || []).map((d) => ({
    type: d.acquisition_type,
    amount_usd: d.cost_basis_usd,
  }));
}

/**
 * Get total fees paid in a year
 */
async function getFeesPaid(
  supabase: SupabaseClient,
  userId: string,
  year: number
): Promise<number> {
  const startDate = `${year}-01-01T00:00:00Z`;
  const endDate = `${year}-12-31T23:59:59Z`;

  const { data, error } = await supabase
    .from("transactions")
    .select("fee_usd")
    .eq("user_id", userId)
    .gte("block_timestamp", startDate)
    .lte("block_timestamp", endDate);

  if (error) {
    console.error(`[TaxReport] Error fetching fees:`, error.message);
    return 0;
  }

  return (data || []).reduce((sum, tx) => sum + (tx.fee_usd || 0), 0);
}

/**
 * Generate tax summary for a year
 */
export async function getTaxSummary(
  supabase: SupabaseClient,
  userId: string,
  year: number,
  method: "FIFO" | "LIFO" | "HIFO" = "FIFO"
): Promise<TaxSummary> {
  // Get disposed lots for the year
  const disposedLots = await getDisposedLots(supabase, userId, year);

  // Split into short-term and long-term
  const shortTermLots = disposedLots.filter((l) => !l.is_long_term);
  const longTermLots = disposedLots.filter((l) => l.is_long_term);

  // Calculate short-term
  const shortTerm = {
    proceeds: shortTermLots.reduce((sum, l) => sum + (l.proceeds_usd || 0), 0),
    costBasis: shortTermLots.reduce((sum, l) => sum + (l.cost_basis_usd || 0), 0),
    gainLoss: shortTermLots.reduce((sum, l) => sum + (l.gain_loss_usd || 0), 0),
    transactionCount: shortTermLots.length,
  };

  // Calculate long-term
  const longTerm = {
    proceeds: longTermLots.reduce((sum, l) => sum + (l.proceeds_usd || 0), 0),
    costBasis: longTermLots.reduce((sum, l) => sum + (l.cost_basis_usd || 0), 0),
    gainLoss: longTermLots.reduce((sum, l) => sum + (l.gain_loss_usd || 0), 0),
    transactionCount: longTermLots.length,
  };

  // Get income
  const incomeTransactions = await getIncomeTransactions(supabase, userId, year);
  const income = {
    total: incomeTransactions.reduce((sum, t) => sum + t.amount_usd, 0),
    byType: incomeTransactions.reduce(
      (acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + t.amount_usd;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  // Get fees
  const feesPaid = await getFeesPaid(supabase, userId, year);

  // Get unrealized
  const unrealizedLots = await getUnrealizedLots(supabase, userId);
  const unrealizedCostBasis = unrealizedLots.reduce(
    (sum, l) => sum + (l.cost_basis_usd || 0),
    0
  );

  // Note: unrealizedGains requires current prices - set to 0 for now
  // Would need to fetch current prices for each asset to calculate

  return {
    year,
    method,
    shortTerm,
    longTerm,
    income,
    feesPaid,
    unrealizedGains: 0, // TODO: Calculate with current prices
    unrealizedCostBasis,
  };
}

/**
 * Format date for IRS 8949 (MM/DD/YYYY)
 */
function formatIRSDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Escape CSV field (handle commas and quotes)
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate Form 8949 CSV - separates short-term and long-term
 *
 * IRS Form 8949 format:
 * - Part I: Short-term capital gains/losses (held 1 year or less)
 * - Part II: Long-term capital gains/losses (held more than 1 year)
 */
export function formatAs8949CSV(lots: TaxLot[]): string {
  const headers = [
    "Description of Property",
    "Date Acquired",
    "Date Sold",
    "Proceeds (Sales Price)",
    "Cost or Other Basis",
    "Adjustment to Gain or Loss",
    "Gain or (Loss)",
  ];

  // Separate into short-term and long-term
  const shortTerm = lots.filter((l) => !l.is_long_term);
  const longTerm = lots.filter((l) => l.is_long_term);

  const formatRow = (lot: TaxLot) => [
    escapeCSV(`${parseFloat(lot.amount).toFixed(8)} ${lot.asset}`),
    formatIRSDate(lot.acquisition_date),
    formatIRSDate(lot.disposal_date),
    (lot.proceeds_usd || 0).toFixed(2),
    (lot.cost_basis_usd || 0).toFixed(2),
    "0.00", // Adjustment column (for wash sales, etc.)
    (lot.gain_loss_usd || 0).toFixed(2),
  ];

  const lines: string[] = [];

  // Part I: Short-term
  lines.push("FORM 8949 - Part I: Short-Term Capital Gains and Losses");
  lines.push(headers.join(","));
  shortTerm.forEach((lot) => lines.push(formatRow(lot).join(",")));

  // Subtotal for short-term
  if (shortTerm.length > 0) {
    const stProceeds = shortTerm.reduce((s, l) => s + (l.proceeds_usd || 0), 0);
    const stBasis = shortTerm.reduce((s, l) => s + (l.cost_basis_usd || 0), 0);
    const stGain = shortTerm.reduce((s, l) => s + (l.gain_loss_usd || 0), 0);
    lines.push(`Short-Term Totals,,,${stProceeds.toFixed(2)},${stBasis.toFixed(2)},0.00,${stGain.toFixed(2)}`);
  }
  lines.push(""); // Blank line between sections

  // Part II: Long-term
  lines.push("FORM 8949 - Part II: Long-Term Capital Gains and Losses");
  lines.push(headers.join(","));
  longTerm.forEach((lot) => lines.push(formatRow(lot).join(",")));

  // Subtotal for long-term
  if (longTerm.length > 0) {
    const ltProceeds = longTerm.reduce((s, l) => s + (l.proceeds_usd || 0), 0);
    const ltBasis = longTerm.reduce((s, l) => s + (l.cost_basis_usd || 0), 0);
    const ltGain = longTerm.reduce((s, l) => s + (l.gain_loss_usd || 0), 0);
    lines.push(`Long-Term Totals,,,${ltProceeds.toFixed(2)},${ltBasis.toFixed(2)},0.00,${ltGain.toFixed(2)}`);
  }

  return lines.join("\n");
}

/**
 * Generate simple transactions CSV export
 */
export function formatTransactionsCSV(lots: TaxLot[]): string {
  const headers = [
    "Asset",
    "Amount",
    "Acquisition Date",
    "Acquisition Price (USD)",
    "Cost Basis (USD)",
    "Disposal Date",
    "Disposal Price (USD)",
    "Proceeds (USD)",
    "Gain/Loss (USD)",
    "Term",
    "Acquisition Type",
  ];

  const rows = lots.map((lot) => [
    lot.asset,
    parseFloat(lot.amount).toFixed(8),
    formatIRSDate(lot.acquisition_date),
    (lot.acquisition_price_usd || 0).toFixed(2),
    (lot.cost_basis_usd || 0).toFixed(2),
    lot.disposal_date ? formatIRSDate(lot.disposal_date) : "HELD",
    lot.disposal_price_usd ? lot.disposal_price_usd.toFixed(2) : "",
    lot.proceeds_usd ? lot.proceeds_usd.toFixed(2) : "",
    lot.gain_loss_usd ? lot.gain_loss_usd.toFixed(2) : "",
    lot.is_disposed ? (lot.is_long_term ? "Long-Term" : "Short-Term") : "Unrealized",
    lot.acquisition_type || "purchase",
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
