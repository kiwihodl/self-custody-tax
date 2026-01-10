/**
 * Client-side tax lot processing
 * Uses browser Supabase client (already authenticated)
 * Calls server API for CoinGecko price fetches (avoids CORS)
 */

import { SupabaseClient } from "@supabase/supabase-js";

interface ProcessingResult {
  created: number;
  processed: number;
  errors: string[];
}

/**
 * Fetch historical price via server API (avoids CORS)
 */
async function fetchPriceViaApi(asset: string, date: string): Promise<number | null> {
  try {
    const response = await fetch("/api/prices/historical", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset, date }),
    });

    if (!response.ok) {
      console.error(`[Price] Failed to fetch ${asset} for ${date}`);
      return null;
    }

    const data = await response.json();
    return data.priceUsd || null;
  } catch (err) {
    console.error(`[Price] Error fetching ${asset} for ${date}:`, err);
    return null;
  }
}

/**
 * Create tax lots for receive transactions in a wallet
 */
export async function createTaxLotsForWallet(
  supabase: SupabaseClient,
  walletId: string
): Promise<ProcessingResult> {
  const result: ProcessingResult = { created: 0, processed: 0, errors: [] };

  try {
    // Get receive transactions without tax lots
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("id, txid, amount, block_timestamp, category")
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

    // Check which transactions already have tax lots
    const txIds = transactions.map((t) => t.id);
    const { data: existingLots } = await supabase
      .from("tax_lots")
      .select("transaction_id")
      .in("transaction_id", txIds);

    const existingTxIds = new Set(existingLots?.map((l) => l.transaction_id) || []);

    // Create tax lots for transactions that don't have them
    for (const tx of transactions) {
      if (existingTxIds.has(tx.id)) {
        continue; // Already has a tax lot
      }

      if (!tx.block_timestamp) {
        result.errors.push(`Transaction ${tx.txid.slice(0, 8)}... has no timestamp`);
        continue;
      }

      // Fetch historical price via server API
      const date = tx.block_timestamp.split("T")[0];
      const priceUsd = await fetchPriceViaApi("BTC", date);

      if (priceUsd === null) {
        result.errors.push(`No price for ${date}`);
        continue;
      }

      const amount = parseFloat(tx.amount);
      const costBasis = amount * priceUsd;

      // Map category to acquisition type
      const acquisitionType =
        tx.category === "receive"
          ? "purchase"
          : tx.category === "income"
          ? "income"
          : tx.category === "mining"
          ? "mining"
          : tx.category === "interest"
          ? "interest"
          : tx.category === "airdrop"
          ? "airdrop"
          : "purchase";

      // Get user_id from wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("user_id")
        .eq("id", walletId)
        .single();

      if (!wallet) {
        result.errors.push("Could not get wallet user_id");
        continue;
      }

      // Insert tax lot
      const { error: insertError } = await supabase.from("tax_lots").insert({
        user_id: wallet.user_id,
        wallet_id: walletId,
        transaction_id: tx.id,
        asset: "BTC",
        amount: tx.amount,
        txid: tx.txid,
        acquisition_date: tx.block_timestamp,
        acquisition_price_usd: priceUsd,
        cost_basis_usd: costBasis,
        acquisition_type: acquisitionType,
        is_disposed: false,
      });

      if (insertError) {
        result.errors.push(`Failed to create lot: ${insertError.message}`);
      } else {
        result.created++;
      }
    }
  } catch (err) {
    result.errors.push(`Unexpected error: ${err}`);
  }

  return result;
}

/**
 * Process send transactions (disposals) for a wallet
 */
export async function processSendTransactions(
  supabase: SupabaseClient,
  walletId: string,
  method: "FIFO" | "LIFO" | "HIFO" = "FIFO"
): Promise<ProcessingResult> {
  const result: ProcessingResult = { created: 0, processed: 0, errors: [] };

  try {
    // Get send transactions
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("id, txid, amount, block_timestamp")
      .eq("wallet_id", walletId)
      .eq("category", "send")
      .order("block_timestamp", { ascending: true });

    if (txError) {
      result.errors.push(`Failed to fetch send transactions: ${txError.message}`);
      return result;
    }

    if (!transactions || transactions.length === 0) {
      return result;
    }

    // Get user_id from wallet
    const { data: wallet } = await supabase
      .from("wallets")
      .select("user_id")
      .eq("id", walletId)
      .single();

    if (!wallet) {
      result.errors.push("Could not get wallet user_id");
      return result;
    }

    for (const tx of transactions) {
      if (!tx.block_timestamp) continue;

      const amountToDispose = Math.abs(parseFloat(tx.amount));
      const disposalDate = tx.block_timestamp;
      const disposalDateStr = disposalDate.split("T")[0];

      // Get disposal price
      const disposalPrice = await fetchPriceViaApi("BTC", disposalDateStr);
      if (!disposalPrice) {
        result.errors.push(`No disposal price for ${disposalDateStr}`);
        continue;
      }

      // Get undisposed lots for this wallet, sorted by method
      let orderColumn: string;
      let orderAscending: boolean;

      switch (method) {
        case "LIFO":
          orderColumn = "acquisition_date";
          orderAscending = false;
          break;
        case "HIFO":
          orderColumn = "acquisition_price_usd";
          orderAscending = false;
          break;
        default: // FIFO
          orderColumn = "acquisition_date";
          orderAscending = true;
      }

      const { data: lots, error: lotsError } = await supabase
        .from("tax_lots")
        .select("*")
        .eq("wallet_id", walletId)
        .eq("is_disposed", false)
        .order(orderColumn, { ascending: orderAscending });

      if (lotsError || !lots || lots.length === 0) {
        result.errors.push(`No undisposed lots for tx ${tx.txid.slice(0, 8)}...`);
        continue;
      }

      // Allocate disposal across lots
      let remaining = amountToDispose;

      for (const lot of lots) {
        if (remaining <= 0) break;

        const lotAmount = parseFloat(lot.amount);
        const amountFromLot = Math.min(remaining, lotAmount);
        remaining -= amountFromLot;

        // Calculate gain/loss for this lot
        const proceeds = amountFromLot * disposalPrice;
        const costBasis = amountFromLot * lot.acquisition_price_usd;
        const gainLoss = proceeds - costBasis;

        // Determine if long-term (held > 1 year)
        const acquisitionDate = new Date(lot.acquisition_date);
        const disposalDateObj = new Date(disposalDate);
        const holdingPeriodMs = disposalDateObj.getTime() - acquisitionDate.getTime();
        const oneYearMs = 365 * 24 * 60 * 60 * 1000;
        const isLongTerm = holdingPeriodMs > oneYearMs;

        if (amountFromLot >= lotAmount) {
          // Fully dispose the lot
          const { error: updateError } = await supabase
            .from("tax_lots")
            .update({
              is_disposed: true,
              disposal_date: disposalDate,
              disposal_price_usd: disposalPrice,
              disposal_transaction_id: tx.id,
              proceeds_usd: proceeds,
              gain_loss_usd: gainLoss,
              is_long_term: isLongTerm,
            })
            .eq("id", lot.id);

          if (updateError) {
            result.errors.push(`Failed to update lot: ${updateError.message}`);
          } else {
            result.processed++;
          }
        } else {
          // Partial disposal - split the lot
          // 1. Update original lot with remaining amount
          const remainingAmount = lotAmount - amountFromLot;
          const { error: updateError } = await supabase
            .from("tax_lots")
            .update({
              amount: remainingAmount.toString(),
              cost_basis_usd: remainingAmount * lot.acquisition_price_usd,
            })
            .eq("id", lot.id);

          if (updateError) {
            result.errors.push(`Failed to split lot: ${updateError.message}`);
            continue;
          }

          // 2. Create new disposed lot for the used portion
          const { error: insertError } = await supabase.from("tax_lots").insert({
            user_id: lot.user_id,
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
            disposal_date: disposalDate,
            disposal_price_usd: disposalPrice,
            disposal_transaction_id: tx.id,
            proceeds_usd: proceeds,
            gain_loss_usd: gainLoss,
            is_long_term: isLongTerm,
          });

          if (insertError) {
            result.errors.push(`Failed to create disposed lot: ${insertError.message}`);
          } else {
            result.processed++;
          }
        }
      }

      if (remaining > 0) {
        result.errors.push(
          `Insufficient lots for tx ${tx.txid.slice(0, 8)}... (${remaining.toFixed(8)} BTC unallocated)`
        );
      }
    }
  } catch (err) {
    result.errors.push(`Unexpected error: ${err}`);
  }

  return result;
}

/**
 * Process all wallets for a user
 */
export async function processAllWallets(
  supabase: SupabaseClient,
  userId: string,
  method: "FIFO" | "LIFO" | "HIFO" = "FIFO"
): Promise<ProcessingResult> {
  const result: ProcessingResult = { created: 0, processed: 0, errors: [] };

  // Get all user's wallets
  const { data: wallets, error: walletsError } = await supabase
    .from("wallets")
    .select("id")
    .eq("user_id", userId)
    .eq("is_deleted", false);

  if (walletsError) {
    result.errors.push(`Failed to fetch wallets: ${walletsError.message}`);
    return result;
  }

  if (!wallets || wallets.length === 0) {
    result.errors.push("No wallets found");
    return result;
  }

  // Process each wallet
  for (const wallet of wallets) {
    // Create tax lots for receive transactions
    const createResult = await createTaxLotsForWallet(supabase, wallet.id);
    result.created += createResult.created;
    result.errors.push(...createResult.errors);

    // Process send transactions (disposals)
    const processResult = await processSendTransactions(supabase, wallet.id, method);
    result.processed += processResult.processed;
    result.errors.push(...processResult.errors);
  }

  return result;
}
