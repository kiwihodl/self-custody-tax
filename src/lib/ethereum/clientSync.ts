/**
 * Client-side Ethereum stablecoin wallet sync
 *
 * Runs in the browser to avoid Supabase auth issues with server routes.
 * Uses Etherscan public API (no key required for basic queries).
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  getAllTokenBalances,
  getAllTokenTransactions,
  categorizeTokenTransaction,
  TokenBalance,
} from "./etherscan";
import { fetchPrice } from "@/lib/prices/client";
import type { Wallet } from "@/types";

export interface EthereumClientSyncResult {
  success: boolean;
  transactionsAdded: number;
  transactionsUpdated: number;
  balances: TokenBalance[];
  error?: string;
}

/**
 * Client-side Ethereum wallet sync
 */
export async function syncEthereumWalletClient(
  supabase: SupabaseClient,
  wallet: Wallet,
  signal?: AbortSignal
): Promise<EthereumClientSyncResult> {
  const result: EthereumClientSyncResult = {
    success: false,
    transactionsAdded: 0,
    transactionsUpdated: 0,
    balances: [],
  };

  if (!wallet.address) {
    result.error = "Wallet has no Ethereum address";
    return result;
  }

  console.log(`[EthClientSync] Starting sync for ${wallet.name}`);

  try {
    // Check for abort
    if (signal?.aborted) {
      throw new Error("Sync aborted");
    }

    // Fetch balances
    const balances = await getAllTokenBalances(wallet.address);
    result.balances = balances;

    const totalBalance = balances.reduce((sum, b) => sum + parseFloat(b.balance), 0);
    console.log(`[EthClientSync] Total balance: $${totalBalance.toFixed(2)}`);

    // Check for abort
    if (signal?.aborted) {
      throw new Error("Sync aborted");
    }

    // Fetch transactions
    const transactions = await getAllTokenTransactions(wallet.address);
    console.log(`[EthClientSync] Found ${transactions.length} transactions`);

    // Get existing transactions
    const { data: existingTxs } = await supabase
      .from("transactions")
      .select("txid")
      .eq("wallet_id", wallet.id);

    const existingTxids = new Set((existingTxs || []).map((t) => t.txid));

    // Process new transactions
    for (const tx of transactions) {
      if (signal?.aborted) {
        throw new Error("Sync aborted");
      }

      if (existingTxids.has(tx.hash)) {
        result.transactionsUpdated++;
        continue;
      }

      const category = categorizeTokenTransaction(tx, wallet.address);
      const blockTimestamp = new Date(tx.timestamp * 1000).toISOString();

      // Get historical price
      const priceDate = new Date(tx.timestamp * 1000);
      const price = await fetchPrice(tx.token, priceDate) || 1;

      // Insert transaction
      const { data: insertedTx, error: insertError } = await supabase
        .from("transactions")
        .insert({
          user_id: wallet.user_id,
          wallet_id: wallet.id,
          txid: tx.hash,
          network: "ethereum",
          block_height: tx.blockNumber,
          block_timestamp: blockTimestamp,
          from_address: tx.from,
          to_address: tx.to,
          amount: tx.value,
          token_contract: tx.token === "USDT"
            ? "0xdac17f958d2ee523a2206206994597c13d831ec7"
            : "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          fee: "0",
          fee_usd: 0, // Gas tracked separately for ETH
          category,
          is_internal_transfer: false,
        })
        .select()
        .single();

      if (insertError) {
        console.error(`[EthClientSync] Failed to insert tx:`, insertError.message);
        continue;
      }

      result.transactionsAdded++;

      // Create tax lot for receive transactions
      if (category === "receive" && insertedTx) {
        const costBasisUsd = parseFloat(tx.value) * price;

        await supabase.from("tax_lots").insert({
          user_id: wallet.user_id,
          wallet_id: wallet.id,
          transaction_id: insertedTx.id,
          asset: tx.token,
          amount: tx.value,
          txid: tx.hash,
          acquisition_date: blockTimestamp,
          acquisition_price_usd: price,
          cost_basis_usd: costBasisUsd,
          acquisition_type: "purchase",
          is_disposed: false,
        });
      }
    }

    // Update wallet balance
    await supabase
      .from("wallets")
      .update({
        balance: totalBalance,
        last_synced_at: new Date().toISOString(),
        sync_status: "idle",
        sync_error: null,
      })
      .eq("id", wallet.id);

    result.success = true;
    console.log(`[EthClientSync] Complete: ${result.transactionsAdded} added`);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[EthClientSync] Error:`, errorMessage);

    await supabase
      .from("wallets")
      .update({
        sync_status: "error",
        sync_error: errorMessage,
      })
      .eq("id", wallet.id);

    result.error = errorMessage;
    return result;
  }
}
