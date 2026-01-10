/**
 * Tax lot management
 *
 * Creates tax lots for receive transactions and marks them
 * as disposed when coins are spent.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import BigNumber from "bignumber.js";
import { getPrice } from "@/lib/prices";

export interface TaxLot {
  id: string;
  user_id: string;
  wallet_id: string;
  transaction_id: string;
  asset: string;
  amount: string;
  txid?: string;
  vout?: number;
  acquisition_date: string;
  acquisition_price_usd: number;
  cost_basis_usd: number;
  acquisition_type: string;
  is_disposed: boolean;
  disposal_date?: string;
  disposal_price_usd?: number;
  disposal_transaction_id?: string;
  proceeds_usd?: number;
  gain_loss_usd?: number;
  is_long_term?: boolean;
}

export interface CreateTaxLotsResult {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * Determine acquisition type from transaction category
 */
function getAcquisitionType(
  category: string
): "purchase" | "income" | "mining" | "interest" | "airdrop" | "gift" | null {
  switch (category) {
    case "receive":
      return "purchase"; // Default - user can recategorize
    case "income":
      return "income";
    case "mining":
      return "mining";
    case "interest":
      return "interest";
    case "airdrop":
      return "airdrop";
    default:
      return null; // Not an acquisition
  }
}

/**
 * Create tax lots for all receive transactions that don't have one yet
 *
 * Fetches historical prices from cache/CoinGecko for each transaction date.
 */
export async function createTaxLotsForWallet(
  supabase: SupabaseClient,
  walletId: string
): Promise<CreateTaxLotsResult> {
  const result: CreateTaxLotsResult = {
    created: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // Get wallet info
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("id, user_id, network")
    .eq("id", walletId)
    .single();

  if (walletError || !wallet) {
    result.errors.push("Wallet not found");
    return result;
  }

  // Get transactions that could create tax lots (receive, income, etc.)
  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .eq("wallet_id", walletId)
    .in("category", ["receive", "income", "mining", "interest", "airdrop"])
    .order("block_timestamp", { ascending: true });

  if (txError) {
    result.errors.push(`Failed to fetch transactions: ${txError.message}`);
    return result;
  }

  if (!transactions || transactions.length === 0) {
    return result;
  }

  // Get existing tax lots for this wallet
  const { data: existingLots } = await supabase
    .from("tax_lots")
    .select("transaction_id")
    .eq("wallet_id", walletId);

  const existingTxIds = new Set((existingLots || []).map((l) => l.transaction_id));

  console.log(
    `[TaxLots] Processing ${transactions.length} transactions, ${existingTxIds.size} already have tax lots`
  );

  // Process each transaction
  for (const tx of transactions) {
    // Skip if already has a tax lot
    if (existingTxIds.has(tx.id)) {
      result.skipped++;
      continue;
    }

    // Skip internal transfers - they don't create new tax lots
    if (tx.is_internal_transfer) {
      result.skipped++;
      continue;
    }

    // Get acquisition type
    const acquisitionType = getAcquisitionType(tx.category);
    if (!acquisitionType) {
      result.skipped++;
      continue;
    }

    // Determine asset
    const asset = wallet.network === "bitcoin" ? "BTC" : "ETH";

    // Get amount
    const amount = new BigNumber(tx.amount || "0");
    if (amount.isZero()) {
      result.skipped++;
      continue;
    }

    // Get historical price
    let priceUsd = 0;
    if (tx.block_timestamp) {
      const txDate = new Date(tx.block_timestamp);
      const price = await getPrice(supabase, asset, txDate);
      priceUsd = price || 0;
    }

    // Calculate cost basis
    const costBasisUsd = amount.multipliedBy(priceUsd).toNumber();

    // Create tax lot
    const { error: insertError } = await supabase.from("tax_lots").insert({
      user_id: wallet.user_id,
      wallet_id: walletId,
      transaction_id: tx.id,
      asset,
      amount: amount.toString(),
      txid: tx.txid,
      acquisition_date: tx.block_timestamp,
      acquisition_price_usd: priceUsd,
      cost_basis_usd: costBasisUsd,
      acquisition_type: acquisitionType,
      is_disposed: false,
    });

    if (insertError) {
      result.failed++;
      result.errors.push(`Failed to create tax lot for tx ${tx.txid}: ${insertError.message}`);
    } else {
      result.created++;
      console.log(
        `[TaxLots] Created lot: ${amount.toFixed(8)} ${asset} @ $${priceUsd.toFixed(2)} = $${costBasisUsd.toFixed(2)}`
      );
    }
  }

  console.log(
    `[TaxLots] Complete: ${result.created} created, ${result.skipped} skipped, ${result.failed} failed`
  );

  return result;
}

/**
 * Get undisposed tax lots for an asset, sorted by method
 */
export async function getUndisposedLots(
  supabase: SupabaseClient,
  userId: string,
  asset: string,
  method: "FIFO" | "LIFO" | "HIFO" = "FIFO"
): Promise<TaxLot[]> {
  const { data: lots, error } = await supabase
    .from("tax_lots")
    .select("*")
    .eq("user_id", userId)
    .eq("asset", asset.toUpperCase())
    .eq("is_disposed", false)
    .order("acquisition_date", { ascending: method === "FIFO" });

  if (error) {
    console.error(`[TaxLots] Error fetching undisposed lots:`, error.message);
    return [];
  }

  // For HIFO, sort by acquisition price (highest first)
  if (method === "HIFO") {
    lots.sort((a, b) => b.acquisition_price_usd - a.acquisition_price_usd);
  }

  // For LIFO, reverse the order (most recent first)
  if (method === "LIFO") {
    lots.reverse();
  }

  return lots as TaxLot[];
}

/**
 * Check if a holding period is long-term (> 1 year)
 */
function isLongTerm(acquisitionDate: Date, disposalDate: Date): boolean {
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  return disposalDate.getTime() - acquisitionDate.getTime() > oneYear;
}

export interface DisposalAllocation {
  lotId: string;
  amountUsed: string;
  costBasis: number;
  acquisitionDate: string;
  isLongTerm: boolean;
}

export interface DisposalResult {
  totalCostBasis: number;
  totalProceeds: number;
  gainLoss: number;
  allocations: DisposalAllocation[];
}

/**
 * Calculate disposal using specified method (FIFO, LIFO, HIFO)
 *
 * Does not modify database - returns what would be used.
 * Call applyDisposal() to actually update the lots.
 */
export async function calculateDisposal(
  supabase: SupabaseClient,
  userId: string,
  asset: string,
  amountToDispose: BigNumber,
  disposalDate: Date,
  proceedsUsd: number,
  method: "FIFO" | "LIFO" | "HIFO" = "FIFO"
): Promise<DisposalResult | null> {
  const lots = await getUndisposedLots(supabase, userId, asset, method);

  if (lots.length === 0) {
    console.warn(`[TaxLots] No undisposed lots for ${asset}`);
    return null;
  }

  const allocations: DisposalAllocation[] = [];
  let remaining = amountToDispose;
  let totalCostBasis = 0;

  for (const lot of lots) {
    if (remaining.isLessThanOrEqualTo(0)) break;

    const lotAmount = new BigNumber(lot.amount);
    const amountToUse = BigNumber.min(lotAmount, remaining);
    const proportion = amountToUse.dividedBy(lotAmount);
    const costBasisPortion = proportion.multipliedBy(lot.cost_basis_usd).toNumber();

    allocations.push({
      lotId: lot.id,
      amountUsed: amountToUse.toString(),
      costBasis: costBasisPortion,
      acquisitionDate: lot.acquisition_date,
      isLongTerm: isLongTerm(new Date(lot.acquisition_date), disposalDate),
    });

    totalCostBasis += costBasisPortion;
    remaining = remaining.minus(amountToUse);
  }

  if (remaining.isGreaterThan(0)) {
    console.warn(
      `[TaxLots] Insufficient lots: ${remaining.toString()} ${asset} remaining`
    );
  }

  const gainLoss = proceedsUsd - totalCostBasis;

  return {
    totalCostBasis,
    totalProceeds: proceedsUsd,
    gainLoss,
    allocations,
  };
}

/**
 * Apply a disposal to the database
 *
 * Marks lots as partially/fully disposed and records gain/loss.
 */
export async function applyDisposal(
  supabase: SupabaseClient,
  disposal: DisposalResult,
  disposalTransactionId: string,
  disposalDate: Date,
  disposalPriceUsd: number
): Promise<boolean> {
  for (const alloc of disposal.allocations) {
    // Get current lot
    const { data: lot, error: fetchError } = await supabase
      .from("tax_lots")
      .select("*")
      .eq("id", alloc.lotId)
      .single();

    if (fetchError || !lot) {
      console.error(`[TaxLots] Failed to fetch lot ${alloc.lotId}`);
      continue;
    }

    const lotAmount = new BigNumber(lot.amount);
    const usedAmount = new BigNumber(alloc.amountUsed);
    const remainingAmount = lotAmount.minus(usedAmount);

    if (remainingAmount.isLessThanOrEqualTo(0)) {
      // Fully disposed
      const { error } = await supabase
        .from("tax_lots")
        .update({
          is_disposed: true,
          disposal_date: disposalDate.toISOString(),
          disposal_price_usd: disposalPriceUsd,
          disposal_transaction_id: disposalTransactionId,
          proceeds_usd: alloc.costBasis + (disposal.gainLoss * (parseFloat(alloc.amountUsed) / parseFloat(lot.amount))),
          gain_loss_usd: disposal.gainLoss * (parseFloat(alloc.amountUsed) / parseFloat(lot.amount)),
          is_long_term: alloc.isLongTerm,
        })
        .eq("id", alloc.lotId);

      if (error) {
        console.error(`[TaxLots] Failed to mark lot ${alloc.lotId} as disposed:`, error.message);
        return false;
      }
    } else {
      // Partially disposed - need to split the lot
      // Update original lot with remaining amount
      const originalCostBasis = lot.cost_basis_usd - alloc.costBasis;

      const { error: updateError } = await supabase
        .from("tax_lots")
        .update({
          amount: remainingAmount.toString(),
          cost_basis_usd: originalCostBasis,
        })
        .eq("id", alloc.lotId);

      if (updateError) {
        console.error(`[TaxLots] Failed to update lot ${alloc.lotId}:`, updateError.message);
        return false;
      }

      // Create new lot for disposed portion
      const proportionalProceeds = disposal.totalProceeds * (parseFloat(alloc.amountUsed) / parseFloat(lot.amount));
      const proportionalGain = disposal.gainLoss * (parseFloat(alloc.amountUsed) / parseFloat(lot.amount));

      const { error: insertError } = await supabase.from("tax_lots").insert({
        user_id: lot.user_id,
        wallet_id: lot.wallet_id,
        transaction_id: lot.transaction_id,
        asset: lot.asset,
        amount: alloc.amountUsed,
        txid: lot.txid,
        acquisition_date: lot.acquisition_date,
        acquisition_price_usd: lot.acquisition_price_usd,
        cost_basis_usd: alloc.costBasis,
        acquisition_type: lot.acquisition_type,
        is_disposed: true,
        disposal_date: disposalDate.toISOString(),
        disposal_price_usd: disposalPriceUsd,
        disposal_transaction_id: disposalTransactionId,
        proceeds_usd: proportionalProceeds,
        gain_loss_usd: proportionalGain,
        is_long_term: alloc.isLongTerm,
      });

      if (insertError) {
        console.error(`[TaxLots] Failed to create disposed lot:`, insertError.message);
        return false;
      }
    }
  }

  return true;
}

/**
 * Process all send transactions for a wallet and mark tax lots as disposed
 */
export async function processSendTransactions(
  supabase: SupabaseClient,
  walletId: string,
  method: "FIFO" | "LIFO" | "HIFO" = "FIFO"
): Promise<{ processed: number; errors: string[] }> {
  const result = { processed: 0, errors: [] as string[] };

  // Get wallet info
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("id, user_id, network")
    .eq("id", walletId)
    .single();

  if (walletError || !wallet) {
    result.errors.push("Wallet not found");
    return result;
  }

  const asset = wallet.network === "bitcoin" ? "BTC" : "ETH";

  // Get send transactions
  const { data: sendTxs, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .eq("wallet_id", walletId)
    .eq("category", "send")
    .eq("is_internal_transfer", false)
    .order("block_timestamp", { ascending: true });

  if (txError) {
    result.errors.push(`Failed to fetch transactions: ${txError.message}`);
    return result;
  }

  if (!sendTxs || sendTxs.length === 0) {
    return result;
  }

  // Check which transactions already have disposals
  const { data: existingDisposals } = await supabase
    .from("tax_lots")
    .select("disposal_transaction_id")
    .eq("wallet_id", walletId)
    .eq("is_disposed", true)
    .not("disposal_transaction_id", "is", null);

  const processedTxIds = new Set(
    (existingDisposals || []).map((d) => d.disposal_transaction_id)
  );

  for (const tx of sendTxs) {
    if (processedTxIds.has(tx.id)) {
      continue; // Already processed
    }

    const amount = new BigNumber(tx.amount || "0");
    if (amount.isZero()) {
      continue;
    }

    const disposalDate = new Date(tx.block_timestamp);

    // Get price at disposal
    const price = await getPrice(supabase, asset, disposalDate);
    const proceedsUsd = amount.multipliedBy(price || 0).toNumber();

    // Calculate disposal
    const disposal = await calculateDisposal(
      supabase,
      wallet.user_id,
      asset,
      amount,
      disposalDate,
      proceedsUsd,
      method
    );

    if (!disposal) {
      result.errors.push(`No lots available for tx ${tx.txid}`);
      continue;
    }

    // Apply disposal
    const success = await applyDisposal(
      supabase,
      disposal,
      tx.id,
      disposalDate,
      price || 0
    );

    if (success) {
      result.processed++;
      console.log(
        `[TaxLots] Disposal: ${amount.toFixed(8)} ${asset}, gain/loss: $${disposal.gainLoss.toFixed(2)}`
      );
    } else {
      result.errors.push(`Failed to apply disposal for tx ${tx.txid}`);
    }
  }

  return result;
}
