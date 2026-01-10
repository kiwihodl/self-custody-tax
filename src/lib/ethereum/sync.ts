/**
 * Ethereum stablecoin wallet sync
 *
 * Syncs USDT and USDC transactions from Etherscan API
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  getAllTokenBalances,
  getAllTokenTransactions,
  categorizeTokenTransaction,
  TokenBalance,
} from "./etherscan";
import { getPrice } from "@/lib/prices";
import type { Wallet } from "@/types";

export interface EthereumSyncResult {
  success: boolean;
  transactionsAdded: number;
  transactionsUpdated: number;
  balances: TokenBalance[];
  error?: string;
}

/**
 * Sync an Ethereum stablecoin wallet
 *
 * Fetches USDT and USDC balances and transactions from Etherscan
 */
export async function syncEthereumWallet(
  supabase: SupabaseClient,
  wallet: Wallet
): Promise<EthereumSyncResult> {
  const result: EthereumSyncResult = {
    success: false,
    transactionsAdded: 0,
    transactionsUpdated: 0,
    balances: [],
  };

  if (!wallet.address) {
    result.error = "Wallet has no Ethereum address";
    return result;
  }

  console.log(`[EthSync] Starting sync for wallet ${wallet.name} (${wallet.address.slice(0, 10)}...)`);

  try {
    // Update sync status
    await supabase
      .from("wallets")
      .update({ sync_status: "syncing" })
      .eq("id", wallet.id);

    // Fetch balances
    const balances = await getAllTokenBalances(wallet.address);
    result.balances = balances;

    // Calculate total balance in USD (stablecoins are ~$1)
    const totalBalance = balances.reduce((sum, b) => sum + parseFloat(b.balance), 0);

    console.log(`[EthSync] Total stablecoin balance: $${totalBalance.toFixed(2)}`);

    // Fetch transactions
    const transactions = await getAllTokenTransactions(wallet.address);

    console.log(`[EthSync] Found ${transactions.length} token transactions`);

    // Get existing transactions for this wallet
    const { data: existingTxs } = await supabase
      .from("transactions")
      .select("txid")
      .eq("wallet_id", wallet.id);

    const existingTxids = new Set((existingTxs || []).map((t) => t.txid));

    // Process transactions
    for (const tx of transactions) {
      const category = categorizeTokenTransaction(tx, wallet.address);
      const blockTimestamp = new Date(tx.timestamp * 1000).toISOString();

      if (existingTxids.has(tx.hash)) {
        result.transactionsUpdated++;
        continue;
      }

      // Get historical price for cost basis
      const priceDate = new Date(tx.timestamp * 1000);
      const price = await getPrice(supabase, tx.token, priceDate);
      const feeUsd = (parseInt(tx.gasUsed) * parseInt(tx.gasPrice)) / 1e18 * (price || 1);

      // Insert transaction
      const { error: insertError } = await supabase.from("transactions").insert({
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
        fee: "0", // Gas is paid in ETH, tracked separately
        fee_usd: feeUsd,
        category,
        is_internal_transfer: false,
      });

      if (insertError) {
        console.error(`[EthSync] Failed to insert tx ${tx.hash}:`, insertError.message);
      } else {
        result.transactionsAdded++;

        // Create tax lot for receive transactions
        if (category === "receive") {
          const costBasisUsd = parseFloat(tx.value) * (price || 1);

          await supabase.from("tax_lots").insert({
            user_id: wallet.user_id,
            wallet_id: wallet.id,
            transaction_id: tx.hash, // Will need to update to actual ID
            asset: tx.token,
            amount: tx.value,
            txid: tx.hash,
            acquisition_date: blockTimestamp,
            acquisition_price_usd: price || 1,
            cost_basis_usd: costBasisUsd,
            acquisition_type: "purchase",
            is_disposed: false,
          });
        }
      }
    }

    // Update wallet with balance and sync status
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
    console.log(
      `[EthSync] Complete: ${result.transactionsAdded} added, ${result.transactionsUpdated} existing`
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[EthSync] Error:`, errorMessage);

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
