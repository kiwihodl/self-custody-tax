/**
 * Tax lot management — local-first (IndexedDB via Dexie)
 *
 * Creates tax lots for receive transactions and marks them
 * as disposed when coins are spent.
 */

import BigNumber from "bignumber.js";
import { db, type DBTaxLot } from "@/lib/db";
import { getPrice, formatDate } from "@/lib/prices";

export interface CreateTaxLotsResult {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
}

function getAcquisitionType(
  category: string
): "purchase" | "income" | "mining" | "interest" | "airdrop" | "gift" | null {
  switch (category) {
    case "receive": return "purchase";
    case "income": return "income";
    case "mining": return "mining";
    case "interest": return "interest";
    case "airdrop": return "airdrop";
    default: return null;
  }
}

/**
 * Create tax lots for all receive transactions in a wallet that don't have one yet
 */
export async function createTaxLotsForWallet(
  walletId: number
): Promise<CreateTaxLotsResult> {
  const result: CreateTaxLotsResult = { created: 0, skipped: 0, failed: 0, errors: [] };

  const wallet = await db.wallets.get(walletId);
  if (!wallet) {
    result.errors.push("Wallet not found");
    return result;
  }

  // Get receive-type transactions
  const transactions = await db.transactions
    .where("wallet_id")
    .equals(walletId)
    .toArray();

  const receiveTxs = transactions
    .filter((tx) => ["receive", "income", "mining", "interest", "airdrop"].includes(tx.category))
    .sort((a, b) => (a.block_timestamp ?? "").localeCompare(b.block_timestamp ?? ""));

  if (receiveTxs.length === 0) return result;

  // Get existing tax lots for this wallet
  const existingLots = await db.taxLots.where("wallet_id").equals(walletId).toArray();
  const existingTxIds = new Set(existingLots.map((l) => l.transaction_id));

  // Filter to unprocessed
  const txsToProcess = receiveTxs.filter((tx) => {
    if (existingTxIds.has(tx.id!)) return false;
    if (tx.is_internal_transfer) return false;
    if (!getAcquisitionType(tx.category)) return false;
    if (new BigNumber(tx.amount || "0").isZero()) return false;
    return true;
  });

  result.skipped = receiveTxs.length - txsToProcess.length;

  if (txsToProcess.length === 0) return result;

  // Batch fetch prices
  const datesToFetch = new Set<string>();
  for (const tx of txsToProcess) {
    if (tx.block_timestamp) datesToFetch.add(formatDate(new Date(tx.block_timestamp)));
  }

  const priceMap = new Map<string, number>();
  for (const dateStr of Array.from(datesToFetch)) {
    const price = await getPrice("BTC", new Date(dateStr));
    if (price !== null) priceMap.set(dateStr, price);
  }

  // Create lots
  const lotsToInsert: DBTaxLot[] = [];
  const now = new Date().toISOString();

  for (const tx of txsToProcess) {
    const acquisitionType = getAcquisitionType(tx.category)!;
    const amount = new BigNumber(tx.amount || "0");

    let priceUsd = 0;
    if (tx.block_timestamp) {
      const dateStr = formatDate(new Date(tx.block_timestamp));
      priceUsd = priceMap.get(dateStr) || 0;
    }

    const costBasisUsd = amount.multipliedBy(priceUsd).toNumber();

    lotsToInsert.push({
      wallet_id: walletId,
      transaction_id: tx.id!,
      asset: "BTC",
      amount: amount.toString(),
      txid: tx.txid,
      acquisition_date: tx.block_timestamp || now,
      acquisition_price_usd: priceUsd,
      cost_basis_usd: costBasisUsd,
      acquisition_type: acquisitionType,
      is_disposed: false,
      created_at: now,
      updated_at: now,
    });
  }

  try {
    await db.taxLots.bulkAdd(lotsToInsert);
    result.created = lotsToInsert.length;
  } catch (err) {
    result.failed = lotsToInsert.length;
    result.errors.push(`Batch insert failed: ${err}`);
  }

  return result;
}

/**
 * Get undisposed tax lots sorted by method
 */
export async function getUndisposedLots(
  walletId: number | undefined,
  method: "FIFO" | "LIFO" | "HIFO" = "FIFO"
): Promise<DBTaxLot[]> {
  let lots: DBTaxLot[];

  if (walletId !== undefined) {
    lots = await db.taxLots
      .where("wallet_id")
      .equals(walletId)
      .filter((l) => !l.is_disposed && l.asset === "BTC")
      .toArray();
  } else {
    lots = await db.taxLots
      .filter((l) => !l.is_disposed && l.asset === "BTC")
      .toArray();
  }

  switch (method) {
    case "FIFO":
      lots.sort((a, b) => a.acquisition_date.localeCompare(b.acquisition_date));
      break;
    case "LIFO":
      lots.sort((a, b) => b.acquisition_date.localeCompare(a.acquisition_date));
      break;
    case "HIFO":
      lots.sort((a, b) => b.acquisition_price_usd - a.acquisition_price_usd);
      break;
  }

  return lots;
}

function isLongTerm(acquisitionDate: Date, disposalDate: Date): boolean {
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  return disposalDate.getTime() - acquisitionDate.getTime() > oneYear;
}

export interface DisposalAllocation {
  lotId: number;
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
 * Process send transactions (disposals) for a wallet
 */
export async function processSendTransactions(
  walletId: number,
  method: "FIFO" | "LIFO" | "HIFO" = "FIFO"
): Promise<{ processed: number; errors: string[] }> {
  const result = { processed: 0, errors: [] as string[] };

  const wallet = await db.wallets.get(walletId);
  if (!wallet) {
    result.errors.push("Wallet not found");
    return result;
  }

  // Get send transactions sorted by date
  const allTxs = await db.transactions.where("wallet_id").equals(walletId).toArray();
  const sendTxs = allTxs
    .filter((tx) => tx.category === "send" && !tx.is_internal_transfer)
    .sort((a, b) => (a.block_timestamp ?? "").localeCompare(b.block_timestamp ?? ""));

  if (sendTxs.length === 0) return result;

  // Check which already have disposals
  const existingDisposals = await db.taxLots
    .where("wallet_id")
    .equals(walletId)
    .filter((l) => l.is_disposed && l.disposal_transaction_id != null)
    .toArray();

  const processedTxIds = new Set(existingDisposals.map((d) => d.disposal_transaction_id));

  const txsToProcess = sendTxs.filter((tx) => {
    if (processedTxIds.has(tx.id!)) return false;
    if (new BigNumber(tx.amount || "0").isZero()) return false;
    return true;
  });

  for (const tx of txsToProcess) {
    if (!tx.block_timestamp) continue;

    const amountToDispose = new BigNumber(tx.amount || "0").abs();
    const disposalDate = new Date(tx.block_timestamp);
    const dateStr = formatDate(disposalDate);

    const disposalPrice = await getPrice("BTC", disposalDate);
    if (!disposalPrice) {
      result.errors.push(`No disposal price for ${dateStr}`);
      continue;
    }

    const lots = await getUndisposedLots(walletId, method);
    if (lots.length === 0) {
      result.errors.push(`No undisposed lots for tx ${tx.txid.slice(0, 8)}...`);
      continue;
    }

    let remaining = amountToDispose;

    for (const lot of lots) {
      if (remaining.isLessThanOrEqualTo(0)) break;

      const lotAmount = new BigNumber(lot.amount);
      const amountFromLot = BigNumber.min(remaining, lotAmount);
      remaining = remaining.minus(amountFromLot);

      const proceeds = amountFromLot.multipliedBy(disposalPrice).toNumber();
      const costBasis = amountFromLot.multipliedBy(lot.acquisition_price_usd).toNumber();
      const gainLoss = proceeds - costBasis;
      const longTerm = isLongTerm(new Date(lot.acquisition_date), disposalDate);

      if (amountFromLot.isGreaterThanOrEqualTo(lotAmount)) {
        // Fully dispose
        await db.taxLots.update(lot.id!, {
          is_disposed: true,
          disposal_date: tx.block_timestamp,
          disposal_price_usd: disposalPrice,
          disposal_transaction_id: tx.id,
          proceeds_usd: proceeds,
          gain_loss_usd: gainLoss,
          is_long_term: longTerm,
          updated_at: new Date().toISOString(),
        });
        result.processed++;
      } else {
        // Partial disposal — split the lot
        const remainingAmount = lotAmount.minus(amountFromLot);
        const now = new Date().toISOString();

        await db.taxLots.update(lot.id!, {
          amount: remainingAmount.toString(),
          cost_basis_usd: remainingAmount.multipliedBy(lot.acquisition_price_usd).toNumber(),
          updated_at: now,
        });

        await db.taxLots.add({
          wallet_id: lot.wallet_id,
          transaction_id: lot.transaction_id,
          asset: lot.asset,
          amount: amountFromLot.toString(),
          txid: lot.txid,
          vout: lot.vout,
          acquisition_date: lot.acquisition_date,
          acquisition_price_usd: lot.acquisition_price_usd,
          cost_basis_usd: costBasis,
          acquisition_type: lot.acquisition_type,
          is_disposed: true,
          disposal_date: tx.block_timestamp,
          disposal_price_usd: disposalPrice,
          disposal_transaction_id: tx.id,
          proceeds_usd: proceeds,
          gain_loss_usd: gainLoss,
          is_long_term: longTerm,
          created_at: now,
          updated_at: now,
        });
        result.processed++;
      }
    }

    if (remaining.isGreaterThan(0)) {
      result.errors.push(
        `Insufficient lots for tx ${tx.txid.slice(0, 8)}... (${remaining.toFixed(8)} BTC unallocated)`
      );
    }
  }

  return result;
}

/**
 * Process all wallets: create lots + process disposals
 */
export async function processAllWallets(
  method: "FIFO" | "LIFO" | "HIFO" = "FIFO"
): Promise<{ created: number; processed: number; errors: string[] }> {
  const result = { created: 0, processed: 0, errors: [] as string[] };

  const wallets = await db.wallets.filter((w) => !w.is_deleted).toArray();
  if (wallets.length === 0) {
    result.errors.push("No wallets found");
    return result;
  }

  for (const wallet of wallets) {
    const createResult = await createTaxLotsForWallet(wallet.id!);
    result.created += createResult.created;
    result.errors.push(...createResult.errors);

    const processResult = await processSendTransactions(wallet.id!, method);
    result.processed += processResult.processed;
    result.errors.push(...processResult.errors);
  }

  return result;
}
