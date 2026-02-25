/**
 * Tax reporting — summaries and exports (local-first)
 */

import { db, type DBTaxLot } from "@/lib/db";

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
export async function getDisposedLots(year: number): Promise<DBTaxLot[]> {
  const startDate = `${year}-01-01T00:00:00Z`;
  const endDate = `${year}-12-31T23:59:59Z`;

  return db.taxLots
    .filter(
      (l) =>
        l.is_disposed &&
        l.disposal_date != null &&
        l.disposal_date >= startDate &&
        l.disposal_date <= endDate
    )
    .sortBy("disposal_date");
}

/**
 * Generate tax summary for a year
 */
export async function getTaxSummary(
  year: number,
  method: "FIFO" | "LIFO" | "HIFO" = "FIFO"
): Promise<TaxSummary> {
  const disposedLots = await getDisposedLots(year);

  const shortTermLots = disposedLots.filter((l) => !l.is_long_term);
  const longTermLots = disposedLots.filter((l) => l.is_long_term);

  const sumField = (lots: DBTaxLot[], field: keyof DBTaxLot) =>
    lots.reduce((sum, l) => sum + ((l[field] as number) || 0), 0);

  const shortTerm = {
    proceeds: sumField(shortTermLots, "proceeds_usd"),
    costBasis: sumField(shortTermLots, "cost_basis_usd"),
    gainLoss: sumField(shortTermLots, "gain_loss_usd"),
    transactionCount: shortTermLots.length,
  };

  const longTerm = {
    proceeds: sumField(longTermLots, "proceeds_usd"),
    costBasis: sumField(longTermLots, "cost_basis_usd"),
    gainLoss: sumField(longTermLots, "gain_loss_usd"),
    transactionCount: longTermLots.length,
  };

  // Income lots for the year
  const startDate = `${year}-01-01T00:00:00Z`;
  const endDate = `${year}-12-31T23:59:59Z`;
  const incomeLots = await db.taxLots
    .filter(
      (l) =>
        ["income", "mining", "interest", "airdrop"].includes(l.acquisition_type) &&
        l.acquisition_date >= startDate &&
        l.acquisition_date <= endDate
    )
    .toArray();

  const income = {
    total: incomeLots.reduce((sum, l) => sum + l.cost_basis_usd, 0),
    byType: incomeLots.reduce(
      (acc, l) => {
        acc[l.acquisition_type] = (acc[l.acquisition_type] || 0) + l.cost_basis_usd;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  // Fees
  const allTxs = await db.transactions
    .filter(
      (tx) =>
        tx.block_timestamp != null &&
        tx.block_timestamp >= startDate &&
        tx.block_timestamp <= endDate
    )
    .toArray();
  const feesPaid = allTxs.reduce((sum, tx) => sum + (tx.fee_usd || 0), 0);

  // Unrealized
  const unrealizedLots = await db.taxLots.filter((l) => !l.is_disposed).toArray();
  const unrealizedCostBasis = unrealizedLots.reduce((sum, l) => sum + l.cost_basis_usd, 0);

  return {
    year,
    method,
    shortTerm,
    longTerm,
    income,
    feesPaid,
    unrealizedGains: 0,
    unrealizedCostBasis,
  };
}

// ============================================
// CSV Export (Form 8949)
// ============================================

function formatIRSDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatAs8949CSV(lots: DBTaxLot[]): string {
  const headers = [
    "Description of Property",
    "Date Acquired",
    "Date Sold",
    "Proceeds (Sales Price)",
    "Cost or Other Basis",
    "Adjustment to Gain or Loss",
    "Gain or (Loss)",
  ];

  const shortTerm = lots.filter((l) => !l.is_long_term);
  const longTerm = lots.filter((l) => l.is_long_term);

  const formatRow = (lot: DBTaxLot) => [
    escapeCSV(`${parseFloat(lot.amount).toFixed(8)} ${lot.asset}`),
    formatIRSDate(lot.acquisition_date),
    formatIRSDate(lot.disposal_date),
    (lot.proceeds_usd || 0).toFixed(2),
    (lot.cost_basis_usd || 0).toFixed(2),
    "0.00",
    (lot.gain_loss_usd || 0).toFixed(2),
  ];

  const lines: string[] = [];

  lines.push("FORM 8949 - Part I: Short-Term Capital Gains and Losses");
  lines.push(headers.join(","));
  shortTerm.forEach((lot) => lines.push(formatRow(lot).join(",")));
  if (shortTerm.length > 0) {
    const p = shortTerm.reduce((s, l) => s + (l.proceeds_usd || 0), 0);
    const b = shortTerm.reduce((s, l) => s + (l.cost_basis_usd || 0), 0);
    const g = shortTerm.reduce((s, l) => s + (l.gain_loss_usd || 0), 0);
    lines.push(`Short-Term Totals,,,${p.toFixed(2)},${b.toFixed(2)},0.00,${g.toFixed(2)}`);
  }
  lines.push("");

  lines.push("FORM 8949 - Part II: Long-Term Capital Gains and Losses");
  lines.push(headers.join(","));
  longTerm.forEach((lot) => lines.push(formatRow(lot).join(",")));
  if (longTerm.length > 0) {
    const p = longTerm.reduce((s, l) => s + (l.proceeds_usd || 0), 0);
    const b = longTerm.reduce((s, l) => s + (l.cost_basis_usd || 0), 0);
    const g = longTerm.reduce((s, l) => s + (l.gain_loss_usd || 0), 0);
    lines.push(`Long-Term Totals,,,${p.toFixed(2)},${b.toFixed(2)},0.00,${g.toFixed(2)}`);
  }

  return lines.join("\n");
}
