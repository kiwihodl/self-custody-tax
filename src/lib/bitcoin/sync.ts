/**
 * Wallet Sync Service
 * Syncs wallet data from Mempool.space and saves to Supabase
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  getAddressInfo,
  getAddressTransactions,
  getXpubInfo,
  getXpubTransactions,
  getBitcoinPrice,
  MempoolTransaction,
} from "./mempool";
import type { Wallet, TransactionCategory } from "@/types";
import BigNumber from "bignumber.js";

export interface SyncResult {
  success: boolean;
  walletId: string;
  newTransactions: number;
  totalBalance: number;
  error?: string;
}

// Transaction data for database insert
interface TransactionInsert {
  user_id: string;
  wallet_id: string;
  txid: string;
  network: string;
  block_height: number | null;
  block_timestamp: string | null;
  inputs: object[];
  outputs: object[];
  amount: string;
  fee: string;
  category: TransactionCategory;
  is_internal_transfer: boolean;
}

// Tax lot data for database insert
interface TaxLotInsert {
  user_id: string;
  wallet_id: string;
  transaction_id: string;
  asset: string;
  amount: string;
  txid: string;
  acquisition_date: string;
  acquisition_price_usd: number;
  cost_basis_usd: number;
  acquisition_type: string;
}

/**
 * Determine transaction category based on inputs/outputs relative to wallet addresses
 */
function determineTransactionCategory(
  tx: MempoolTransaction,
  walletAddresses: string[]
): { category: TransactionCategory; amount: number; fee: number; isInternal: boolean } {
  const addressSet = new Set(walletAddresses.map((a) => a.toLowerCase()));

  let totalIn = 0;
  let totalOut = 0;
  let totalSentToSelf = 0;

  // Calculate total value from our addresses in inputs
  for (const input of tx.vin) {
    if (input.prevout?.scriptpubkey_address) {
      if (addressSet.has(input.prevout.scriptpubkey_address.toLowerCase())) {
        totalIn += input.prevout.value;
      }
    }
  }

  // Calculate total value to our addresses in outputs
  for (const output of tx.vout) {
    if (output.scriptpubkey_address) {
      if (addressSet.has(output.scriptpubkey_address.toLowerCase())) {
        totalOut += output.value;
        // Check if this is also from our addresses (self-transfer)
        if (totalIn > 0) {
          totalSentToSelf += output.value;
        }
      }
    }
  }

  // Determine category
  if (totalIn === 0 && totalOut > 0) {
    // Pure receive - we didn't spend anything
    return { category: "receive", amount: totalOut, fee: 0, isInternal: false };
  } else if (totalIn > 0 && totalOut === 0) {
    // Pure send - nothing came back to us
    return { category: "send", amount: totalIn - tx.fee, fee: tx.fee, isInternal: false };
  } else if (totalIn > 0 && totalOut > 0) {
    // Could be send with change, or internal transfer
    const netAmount = totalOut - totalIn;

    if (totalSentToSelf === totalOut && totalIn === totalOut + tx.fee) {
      // All outputs went back to our addresses - internal transfer/consolidation
      return { category: "internal", amount: 0, fee: tx.fee, isInternal: true };
    } else if (netAmount < 0) {
      // We sent more than we received - it's a send
      return { category: "send", amount: Math.abs(netAmount), fee: tx.fee, isInternal: false };
    } else {
      // Edge case - treat as receive
      return { category: "receive", amount: netAmount, fee: 0, isInternal: false };
    }
  }

  // Default fallback
  return { category: "receive", amount: 0, fee: 0, isInternal: false };
}

/**
 * Sync a single Bitcoin wallet
 */
export async function syncBitcoinWallet(
  supabase: SupabaseClient,
  wallet: Wallet
): Promise<SyncResult> {
  try {
    // Update wallet status to syncing
    await supabase
      .from("wallets")
      .update({ sync_status: "syncing" })
      .eq("id", wallet.id);

    let mempoolTxs: MempoolTransaction[] = [];
    let addresses: string[] = [];
    let balance = 0;

    // Fetch based on wallet type
    if (wallet.xpub) {
      // xpub-based wallet
      try {
        const xpubData = await getXpubTransactions(wallet.xpub);
        mempoolTxs = xpubData.transactions;
        addresses = xpubData.addresses;

        const xpubInfo = await getXpubInfo(wallet.xpub);
        balance = xpubInfo.balance;
      } catch {
        // Mempool.space xpub endpoint might not be available
        // Fall back to single address if stored
        if (wallet.address) {
          const addressInfo = await getAddressInfo(wallet.address);
          mempoolTxs = await getAddressTransactions(wallet.address);
          addresses = [wallet.address];
          balance =
            addressInfo.chain_stats.funded_txo_sum -
            addressInfo.chain_stats.spent_txo_sum;
        } else {
          throw new Error(
            "xpub sync not available and no fallback address"
          );
        }
      }
    } else if (wallet.address) {
      // Single address wallet
      const addressInfo = await getAddressInfo(wallet.address);
      mempoolTxs = await getAddressTransactions(wallet.address);
      addresses = [wallet.address];
      balance =
        addressInfo.chain_stats.funded_txo_sum -
        addressInfo.chain_stats.spent_txo_sum;
    } else {
      throw new Error("Wallet has no xpub or address");
    }

    // Get current BTC price
    let btcPrice = 0;
    try {
      btcPrice = await getBitcoinPrice();
    } catch {
      console.warn("Could not fetch BTC price");
    }

    // Get existing transactions to avoid duplicates
    const { data: existingTxs } = await supabase
      .from("transactions")
      .select("txid")
      .eq("wallet_id", wallet.id);

    const existingTxids = new Set((existingTxs || []).map((t) => t.txid));

    // Process new transactions
    let newTxCount = 0;

    for (const tx of mempoolTxs) {
      if (existingTxids.has(tx.txid)) {
        continue;
      }

      const { category, amount, fee, isInternal } = determineTransactionCategory(tx, addresses);

      // Convert satoshis to BTC string
      const amountBtc = new BigNumber(amount).dividedBy(100000000).toString();
      const feeBtc = new BigNumber(fee).dividedBy(100000000).toString();

      const blockTimestamp = tx.status.block_time
        ? new Date(tx.status.block_time * 1000).toISOString()
        : null;

      // Prepare transaction for insert
      const txInsert: TransactionInsert = {
        user_id: wallet.user_id,
        wallet_id: wallet.id,
        txid: tx.txid,
        network: "bitcoin",
        block_height: tx.status.block_height || null,
        block_timestamp: blockTimestamp,
        inputs: tx.vin.map((input) => ({
          txid: input.txid,
          vout: input.vout,
          value: input.prevout?.value || 0,
          address: input.prevout?.scriptpubkey_address || "",
        })),
        outputs: tx.vout.map((output, index) => ({
          index,
          value: output.value,
          address: output.scriptpubkey_address || "",
          scriptpubkey_type: output.scriptpubkey_type,
        })),
        amount: amountBtc,
        fee: feeBtc,
        category,
        is_internal_transfer: isInternal,
      };

      // Insert transaction
      const { data: insertedTx, error: txError } = await supabase
        .from("transactions")
        .insert(txInsert)
        .select("id")
        .single();

      if (txError) {
        console.error("Error inserting transaction:", txError);
        continue;
      }

      newTxCount++;

      // Create tax lot for receives (cost basis tracking)
      if (
        category === "receive" &&
        parseFloat(amountBtc) > 0 &&
        tx.status.confirmed &&
        insertedTx
      ) {
        // For now, use current price as cost basis if we don't have historical
        // TODO: Fetch historical price at block_time
        const costBasisPerUnit = btcPrice;
        const amountNum = parseFloat(amountBtc);
        const totalCostBasis = amountNum * costBasisPerUnit;

        const taxLotInsert: TaxLotInsert = {
          user_id: wallet.user_id,
          wallet_id: wallet.id,
          transaction_id: insertedTx.id,
          asset: "BTC",
          amount: amountBtc,
          txid: tx.txid,
          acquisition_date: blockTimestamp || new Date().toISOString(),
          acquisition_price_usd: costBasisPerUnit,
          cost_basis_usd: totalCostBasis,
          acquisition_type: "purchase", // Default, user can reclassify
        };

        const { error: lotError } = await supabase
          .from("tax_lots")
          .insert(taxLotInsert);

        if (lotError) {
          console.error("Error inserting tax lot:", lotError);
        }
      }
    }

    // Convert balance from satoshis to BTC
    const balanceBtc = new BigNumber(balance).dividedBy(100000000).toNumber();

    // Update wallet with new balance and sync status
    await supabase
      .from("wallets")
      .update({
        balance: balanceBtc,
        sync_status: "idle",
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", wallet.id);

    return {
      success: true,
      walletId: wallet.id,
      newTransactions: newTxCount,
      totalBalance: balanceBtc,
    };
  } catch (error) {
    console.error("Sync error:", error);

    // Update wallet status to error
    await supabase
      .from("wallets")
      .update({ sync_status: "error" })
      .eq("id", wallet.id);

    return {
      success: false,
      walletId: wallet.id,
      newTransactions: 0,
      totalBalance: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
