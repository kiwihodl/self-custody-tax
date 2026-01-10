/**
 * Client-side wallet sync using Mempool.space public API
 * This runs entirely in the browser, bypassing server-side auth issues
 * Supports:
 *   - Single addresses
 *   - xpub HD wallets (BIP44/49/84)
 *   - Multisig descriptors (wsh, sh-wsh)
 *
 * Key constraints:
 * - Mempool.space has NO native xpub endpoint (confirmed via GitHub issue #177)
 * - Must query each address individually
 * - Rate limited to ~10 req/sec, we use conservative approach with token bucket
 * - Uses AbortController for proper timeout cancellation
 *
 * Performance optimizations:
 * - Token bucket rate limiter for smooth request flow
 * - Exponential backoff with jitter on failures
 * - Batch processing with configurable concurrency
 * - Progress callbacks for UI feedback
 */

import { SupabaseClient } from "@supabase/supabase-js";
import BigNumber from "bignumber.js";
import type { Wallet, TransactionCategory } from "@/types";
import { deriveAddressesFromXpub, validateXpub } from "./derivation";
import { deriveAddressesFromDescriptor, validateDescriptor } from "./descriptors";
import { mempoolRateLimiter, retryWithBackoff } from "@/lib/utils/rate-limiter";

// Use local proxy to avoid CORS issues
const PROXY_API = "/api/proxy/mempool";

// Sync timeout - 90 seconds (increased for larger wallets)
const SYNC_TIMEOUT_MS = 90000;

// Number of addresses to derive for xpub wallets (external + change)
// Using 10 for better coverage while staying within rate limits
const XPUB_GAP_LIMIT = 10;

// Batch processing configuration
const BATCH_SIZE = 3; // Process 3 addresses concurrently
const BATCH_DELAY_MS = 500; // Delay between batches

interface MempoolTx {
  txid: string;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
  vin: Array<{
    txid: string;
    vout: number;
    prevout?: {
      value: number;
      scriptpubkey_address?: string;
    };
  }>;
  vout: Array<{
    value: number;
    scriptpubkey_address?: string;
    scriptpubkey_type?: string;
  }>;
}

interface AddressInfo {
  chain_stats: {
    funded_txo_sum: number;
    spent_txo_sum: number;
  };
}

export interface ClientSyncResult {
  success: boolean;
  newTransactions: number;
  balance: number;
  addressCount?: number;
  error?: string;
}

export interface SyncProgress {
  phase: "deriving" | "fetching" | "processing" | "saving";
  current: number;
  total: number;
  message: string;
}

export type SyncProgressCallback = (progress: SyncProgress) => void;

/**
 * Cancellable delay that respects AbortController
 */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timeoutId = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

/**
 * Fetch with retry using exponential backoff
 */
async function fetchWithRetry(
  url: string,
  signal?: AbortSignal
): Promise<Response> {
  return retryWithBackoff(
    async () => {
      const res = await fetch(url, { signal });

      if (res.ok) {
        return res;
      }

      if (res.status === 429) {
        throw new Error("RATE_LIMITED");
      }

      const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(error.error || `Failed: ${res.status}`);
    },
    {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      signal,
      shouldRetry: (err) => {
        if (err instanceof Error && err.message === "RATE_LIMITED") {
          return true;
        }
        return false;
      },
      onRetry: (err, attempt, delayMs) => {
        console.log(`[Sync] Retry ${attempt + 1}: waiting ${delayMs}ms...`, err);
      },
    }
  );
}

/**
 * Fetch address data with rate limiting
 */
async function fetchAddressData(
  address: string,
  signal?: AbortSignal
): Promise<{ info: AddressInfo; txs: MempoolTx[] }> {
  // Use rate limiter for both requests
  const info = await mempoolRateLimiter.execute(async () => {
    const res = await fetchWithRetry(
      `${PROXY_API}?path=/address/${encodeURIComponent(address)}`,
      signal
    );
    return res.json();
  }, signal);

  const txs = await mempoolRateLimiter.execute(async () => {
    const res = await fetchWithRetry(
      `${PROXY_API}?path=/address/${encodeURIComponent(address)}/txs`,
      signal
    );
    return res.json();
  }, signal);

  return { info, txs };
}

/**
 * Process addresses in batches with concurrent requests
 */
async function fetchAddressesInBatches(
  addresses: string[],
  signal: AbortSignal,
  onProgress?: SyncProgressCallback
): Promise<Map<string, { info: AddressInfo; txs: MempoolTx[] }>> {
  const results = new Map<string, { info: AddressInfo; txs: MempoolTx[] }>();
  let fetchedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    // Check abort before starting batch
    if (signal.aborted) {
      console.log(`[Sync] Aborted after ${fetchedCount} addresses`);
      break;
    }

    const batch = addresses.slice(i, i + BATCH_SIZE);
    onProgress?.({
      phase: "fetching",
      current: fetchedCount,
      total: addresses.length,
      message: `Fetching addresses ${i + 1}-${Math.min(i + BATCH_SIZE, addresses.length)} of ${addresses.length}`,
    });

    // Process batch concurrently
    const batchPromises = batch.map(async (address) => {
      try {
        const data = await fetchAddressData(address, signal);
        return { address, data, success: true as const };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          throw err;
        }
        console.warn(`[Sync] Failed to fetch ${address.slice(0, 12)}...:`, err);
        return { address, data: null, success: false as const };
      }
    });

    try {
      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        if (result.success && result.data) {
          results.set(result.address, result.data);
          fetchedCount++;
        } else {
          failedCount++;
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        break;
      }
    }

    // Delay between batches (except last)
    if (i + BATCH_SIZE < addresses.length) {
      await delay(BATCH_DELAY_MS, signal);
    }
  }

  console.log(`[Sync] Fetched ${fetchedCount}/${addresses.length} addresses (${failedCount} failed)`);
  return results;
}

/**
 * Determine transaction category
 */
function categorize(
  tx: MempoolTx,
  addresses: string[]
): { category: TransactionCategory; amount: number; fee: number; isInternal: boolean } {
  const addrSet = new Set(addresses.map((a) => a.toLowerCase()));

  let totalIn = 0;
  let totalOut = 0;

  for (const inp of tx.vin) {
    if (inp.prevout?.scriptpubkey_address) {
      if (addrSet.has(inp.prevout.scriptpubkey_address.toLowerCase())) {
        totalIn += inp.prevout.value;
      }
    }
  }

  for (const out of tx.vout) {
    if (out.scriptpubkey_address) {
      if (addrSet.has(out.scriptpubkey_address.toLowerCase())) {
        totalOut += out.value;
      }
    }
  }

  if (totalIn === 0 && totalOut > 0) {
    return { category: "receive", amount: totalOut, fee: 0, isInternal: false };
  } else if (totalIn > 0 && totalOut === 0) {
    return { category: "send", amount: totalIn - tx.fee, fee: tx.fee, isInternal: false };
  } else if (totalIn > 0 && totalOut > 0) {
    const net = totalOut - totalIn;
    if (net < 0) {
      return { category: "send", amount: Math.abs(net), fee: tx.fee, isInternal: false };
    }
    return { category: "internal", amount: 0, fee: tx.fee, isInternal: true };
  }

  return { category: "receive", amount: 0, fee: 0, isInternal: false };
}

/**
 * Internal sync implementation with AbortController support
 */
async function syncWalletInternal(
  supabase: SupabaseClient,
  wallet: Wallet,
  signal: AbortSignal,
  onProgress?: SyncProgressCallback
): Promise<ClientSyncResult> {
  // Update status to syncing
  await supabase
    .from("wallets")
    .update({ sync_status: "syncing" })
    .eq("id", wallet.id);

  onProgress?.({
    phase: "deriving",
    current: 0,
    total: 1,
    message: "Preparing wallet addresses...",
  });

  // Determine addresses to sync
  let addresses: string[] = [];

  if (wallet.address) {
    // Single address mode
    addresses = [wallet.address];
    console.log(`[Sync] Single address mode: ${wallet.address}`);
  } else if (wallet.multisig_config?.descriptor) {
    // Multisig descriptor mode - derive addresses from descriptor
    const validation = validateDescriptor(wallet.multisig_config.descriptor);
    if (!validation.valid) {
      throw new Error(`Invalid descriptor: ${validation.error}`);
    }

    // Derive addresses from multisig descriptor
    addresses = deriveAddressesFromDescriptor(wallet.multisig_config.descriptor, XPUB_GAP_LIMIT, true);
    const quorum = wallet.multisig_config.quorum_required && wallet.multisig_config.total_keys
      ? `${wallet.multisig_config.quorum_required}-of-${wallet.multisig_config.total_keys}`
      : "multisig";
    console.log(`[Sync] Descriptor mode (${quorum}): derived ${addresses.length} addresses`);
  } else if (wallet.xpub) {
    // HD wallet mode - derive addresses from xpub
    const validation = validateXpub(wallet.xpub);
    if (!validation.valid) {
      throw new Error(`Invalid xpub: ${validation.error}`);
    }

    // Derive limited addresses to avoid rate limits (external + change)
    addresses = deriveAddressesFromXpub(wallet.xpub, XPUB_GAP_LIMIT, true);
    console.log(`[Sync] xpub mode: derived ${addresses.length} addresses (${XPUB_GAP_LIMIT} external + ${XPUB_GAP_LIMIT} change)`);
  } else {
    throw new Error("Wallet has no address, descriptor, or xpub");
  }

  // Fetch data for all addresses using batch processing
  const addressDataMap = await fetchAddressesInBatches(addresses, signal, onProgress);

  // If we got nothing at all, fail
  if (addressDataMap.size === 0) {
    return {
      success: false,
      newTransactions: 0,
      balance: 0,
      error: signal.aborted
        ? "Sync timed out - try again"
        : "Failed to fetch any address data",
    };
  }

  // Aggregate balance across fetched addresses
  let totalBalance = 0;
  let addressesWithBalance = 0;
  for (const [addr, data] of Array.from(addressDataMap.entries())) {
    const addrBalance =
      data.info.chain_stats.funded_txo_sum - data.info.chain_stats.spent_txo_sum;
    if (addrBalance > 0) {
      addressesWithBalance++;
      console.log(`[Sync] Address with balance: ${addr.slice(0, 12)}... = ${addrBalance} sats`);
    }
    totalBalance += addrBalance;
  }
  const balanceBtc = new BigNumber(totalBalance).dividedBy(100000000).toNumber();
  console.log(`[Sync] Total: ${totalBalance} sats (${balanceBtc} BTC) across ${addressesWithBalance} addresses`);

  // Deduplicate transactions by txid
  const allTxs: MempoolTx[] = [];
  const seenTxids = new Set<string>();
  for (const data of Array.from(addressDataMap.values())) {
    for (const tx of data.txs) {
      if (!seenTxids.has(tx.txid)) {
        seenTxids.add(tx.txid);
        allTxs.push(tx);
      }
    }
  }
  console.log(`[Sync] Found ${allTxs.length} unique transactions`);

  // Get existing txids from database
  const { data: existing } = await supabase
    .from("transactions")
    .select("txid")
    .eq("wallet_id", wallet.id);

  const existingIds = new Set((existing || []).map((t) => t.txid));

  // Process new transactions
  onProgress?.({
    phase: "processing",
    current: 0,
    total: allTxs.length,
    message: `Processing ${allTxs.length} transactions...`,
  });

  let newCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < allTxs.length; i++) {
    const tx = allTxs[i];

    if (existingIds.has(tx.txid)) {
      skippedCount++;
      continue;
    }

    // Pass all addresses for accurate categorization
    const { category, amount, fee, isInternal } = categorize(tx, addresses);
    const amountBtc = new BigNumber(amount).dividedBy(100000000).toString();
    const feeBtc = new BigNumber(fee).dividedBy(100000000).toString();

    const { error: txErr } = await supabase.from("transactions").insert({
      user_id: wallet.user_id,
      wallet_id: wallet.id,
      txid: tx.txid,
      network: "bitcoin",
      block_height: tx.status.block_height || null,
      block_timestamp: tx.status.block_time
        ? new Date(tx.status.block_time * 1000).toISOString()
        : null,
      inputs: tx.vin.map((inp) => ({
        txid: inp.txid,
        vout: inp.vout,
        value: inp.prevout?.value || 0,
        address: inp.prevout?.scriptpubkey_address || "",
      })),
      outputs: tx.vout.map((o, idx) => ({
        index: idx,
        value: o.value,
        address: o.scriptpubkey_address || "",
      })),
      amount: amountBtc,
      fee: feeBtc,
      category,
      is_internal_transfer: isInternal,
    });

    if (txErr) {
      errorCount++;
      console.error(`[Sync] Failed to insert tx ${tx.txid}:`, txErr.message);
    } else {
      newCount++;
    }

    // Update progress every 10 transactions
    if (i % 10 === 0) {
      onProgress?.({
        phase: "processing",
        current: i + 1,
        total: allTxs.length,
        message: `Processed ${i + 1} of ${allTxs.length} transactions`,
      });
    }
  }
  console.log(`[Sync] Result: ${newCount} new, ${skippedCount} skipped, ${errorCount} errors`);

  // Update wallet with data we got
  onProgress?.({
    phase: "saving",
    current: 1,
    total: 1,
    message: "Saving wallet data...",
  });

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
    newTransactions: newCount,
    balance: balanceBtc,
    addressCount: addressDataMap.size,
  };
}

/**
 * Sync a wallet from the client side with proper timeout using AbortController
 * Supports both single addresses and xpub-based HD wallets
 *
 * Key improvements:
 * - AbortController for cancellation and timeout
 * - Token bucket rate limiting for smooth API usage
 * - Exponential backoff with jitter on failures
 * - Batch processing for large wallets
 * - Progress callbacks for UI feedback
 */
export async function syncWalletClient(
  supabase: SupabaseClient,
  wallet: Wallet,
  onProgress?: SyncProgressCallback
): Promise<ClientSyncResult> {
  // Create AbortController for timeout
  const controller = new AbortController();
  const { signal } = controller;

  // Set up timeout to abort
  const timeoutId = setTimeout(() => {
    console.log(`[Sync] Timeout after ${SYNC_TIMEOUT_MS / 1000}s - aborting`);
    controller.abort();
  }, SYNC_TIMEOUT_MS);

  try {
    const result = await syncWalletInternal(supabase, wallet, signal, onProgress);
    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);

    // Determine error message
    let errorMessage: string;
    if (err instanceof DOMException && err.name === "AbortError") {
      errorMessage = `Sync timed out after ${SYNC_TIMEOUT_MS / 1000} seconds`;
    } else if (err instanceof Error) {
      errorMessage = err.message;
    } else {
      errorMessage = "Unknown error";
    }

    // Update wallet status to error
    await supabase
      .from("wallets")
      .update({ sync_status: "error", sync_error: errorMessage })
      .eq("id", wallet.id);

    return {
      success: false,
      newTransactions: 0,
      balance: 0,
      error: errorMessage,
    };
  }
}
