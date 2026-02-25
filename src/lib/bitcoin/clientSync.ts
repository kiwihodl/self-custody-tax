/**
 * Client-side wallet sync using Mempool.space API (or custom node)
 * Local-first — stores directly to IndexedDB via Dexie
 */

import BigNumber from "bignumber.js";
import { db, type DBTransaction } from "@/lib/db";
import { getSetting } from "@/lib/db";
import { deriveAddressesFromXpub, validateXpub } from "./derivation";
import { deriveAddressesFromDescriptor, validateDescriptor } from "./descriptors";
import { mempoolRateLimiter, retryWithBackoff } from "@/lib/utils/rate-limiter";
import type { TransactionCategory } from "@/types";

const DEFAULT_MEMPOOL_API = "https://mempool.space/api";
const SYNC_TIMEOUT_MS = 90000;
const XPUB_GAP_LIMIT = 10;
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 500;

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

async function getMempoolApi(): Promise<string> {
  return getSetting<string>("mempoolApi", DEFAULT_MEMPOOL_API);
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); });
  });
}

async function fetchWithRetry(url: string, signal?: AbortSignal): Promise<Response> {
  return retryWithBackoff(
    async () => {
      const res = await fetch(url, { signal });
      if (res.ok) return res;
      if (res.status === 429) throw new Error("RATE_LIMITED");
      throw new Error(`HTTP ${res.status}`);
    },
    {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      signal,
      shouldRetry: (err) => err instanceof Error && err.message === "RATE_LIMITED",
      onRetry: (err, attempt, delayMs) => console.log(`[Sync] Retry ${attempt + 1}: waiting ${delayMs}ms...`),
    }
  );
}

async function fetchAddressData(
  apiBase: string,
  address: string,
  signal?: AbortSignal
): Promise<{ info: AddressInfo; txs: MempoolTx[] }> {
  const info = await mempoolRateLimiter.execute(async () => {
    const res = await fetchWithRetry(`${apiBase}/address/${encodeURIComponent(address)}`, signal);
    return res.json();
  }, signal);

  const txs = await mempoolRateLimiter.execute(async () => {
    const res = await fetchWithRetry(`${apiBase}/address/${encodeURIComponent(address)}/txs`, signal);
    return res.json();
  }, signal);

  return { info, txs };
}

async function fetchAddressesInBatches(
  apiBase: string,
  addresses: string[],
  signal: AbortSignal,
  onProgress?: SyncProgressCallback
): Promise<Map<string, { info: AddressInfo; txs: MempoolTx[] }>> {
  const results = new Map<string, { info: AddressInfo; txs: MempoolTx[] }>();
  let fetchedCount = 0;

  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    if (signal.aborted) break;

    const batch = addresses.slice(i, i + BATCH_SIZE);
    onProgress?.({
      phase: "fetching",
      current: fetchedCount,
      total: addresses.length,
      message: `Fetching addresses ${i + 1}-${Math.min(i + BATCH_SIZE, addresses.length)} of ${addresses.length}`,
    });

    const batchPromises = batch.map(async (address) => {
      try {
        const data = await fetchAddressData(apiBase, address, signal);
        return { address, data, success: true as const };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") throw err;
        return { address, data: null, success: false as const };
      }
    });

    try {
      const batchResults = await Promise.all(batchPromises);
      for (const r of batchResults) {
        if (r.success && r.data) { results.set(r.address, r.data); fetchedCount++; }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") break;
    }

    if (i + BATCH_SIZE < addresses.length) await delay(BATCH_DELAY_MS, signal);
  }

  return results;
}

function categorize(
  tx: MempoolTx,
  addresses: string[]
): { category: TransactionCategory; amount: number; fee: number; isInternal: boolean } {
  const addrSet = new Set(addresses.map((a) => a.toLowerCase()));
  let totalIn = 0, totalOut = 0;

  for (const inp of tx.vin) {
    if (inp.prevout?.scriptpubkey_address && addrSet.has(inp.prevout.scriptpubkey_address.toLowerCase())) {
      totalIn += inp.prevout.value;
    }
  }
  for (const out of tx.vout) {
    if (out.scriptpubkey_address && addrSet.has(out.scriptpubkey_address.toLowerCase())) {
      totalOut += out.value;
    }
  }

  if (totalIn === 0 && totalOut > 0) return { category: "receive", amount: totalOut, fee: 0, isInternal: false };
  if (totalIn > 0 && totalOut === 0) return { category: "send", amount: totalIn - tx.fee, fee: tx.fee, isInternal: false };
  if (totalIn > 0 && totalOut > 0) {
    const net = totalOut - totalIn;
    if (net < 0) return { category: "send", amount: Math.abs(net), fee: tx.fee, isInternal: false };
    return { category: "internal", amount: 0, fee: tx.fee, isInternal: true };
  }
  return { category: "receive", amount: 0, fee: 0, isInternal: false };
}

/**
 * Sync a wallet — fetches from Mempool API, stores in IndexedDB
 */
export async function syncWalletClient(
  walletId: number,
  onProgress?: SyncProgressCallback
): Promise<ClientSyncResult> {
  const controller = new AbortController();
  const { signal } = controller;
  const timeoutId = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

  try {
    const wallet = await db.wallets.get(walletId);
    if (!wallet) throw new Error("Wallet not found");

    const apiBase = await getMempoolApi();

    await db.wallets.update(walletId, { sync_status: "syncing" });

    onProgress?.({ phase: "deriving", current: 0, total: 1, message: "Preparing wallet addresses..." });

    // Determine addresses
    let addresses: string[] = [];
    if (wallet.address) {
      addresses = [wallet.address];
    } else if (wallet.multisig_config) {
      const config = typeof wallet.multisig_config === "string" ? JSON.parse(wallet.multisig_config) : wallet.multisig_config;
      if (config.descriptor) {
        const v = validateDescriptor(config.descriptor);
        if (!v.valid) throw new Error(`Invalid descriptor: ${v.error}`);
        addresses = deriveAddressesFromDescriptor(config.descriptor, XPUB_GAP_LIMIT, true);
      }
    } else if (wallet.xpub) {
      const v = validateXpub(wallet.xpub);
      if (!v.valid) throw new Error(`Invalid xpub: ${v.error}`);
      addresses = deriveAddressesFromXpub(wallet.xpub, XPUB_GAP_LIMIT, true);
    } else {
      throw new Error("Wallet has no address, descriptor, or xpub");
    }

    // Fetch from Mempool
    const addressDataMap = await fetchAddressesInBatches(apiBase, addresses, signal, onProgress);
    if (addressDataMap.size === 0) {
      return { success: false, newTransactions: 0, balance: 0, error: signal.aborted ? "Sync timed out" : "Failed to fetch address data" };
    }

    // Calculate balance
    let totalBalance = 0;
    for (const data of Array.from(addressDataMap.values())) {
      totalBalance += data.info.chain_stats.funded_txo_sum - data.info.chain_stats.spent_txo_sum;
    }
    const balanceBtc = new BigNumber(totalBalance).dividedBy(100000000).toNumber();

    // Deduplicate transactions
    const allTxs: MempoolTx[] = [];
    const seenTxids = new Set<string>();
    for (const data of Array.from(addressDataMap.values())) {
      for (const tx of data.txs) {
        if (!seenTxids.has(tx.txid)) { seenTxids.add(tx.txid); allTxs.push(tx); }
      }
    }

    // Check existing
    const existingTxs = await db.transactions.where("wallet_id").equals(walletId).toArray();
    const existingIds = new Set(existingTxs.map((t) => t.txid));

    onProgress?.({ phase: "processing", current: 0, total: allTxs.length, message: `Processing ${allTxs.length} transactions...` });

    // Insert new transactions
    const now = new Date().toISOString();
    const newTxs: DBTransaction[] = [];

    for (const tx of allTxs) {
      if (existingIds.has(tx.txid)) continue;

      const { category, amount, fee, isInternal } = categorize(tx, addresses);
      const amountBtc = new BigNumber(amount).dividedBy(100000000).toString();
      const feeBtc = new BigNumber(fee).dividedBy(100000000).toString();

      newTxs.push({
        wallet_id: walletId,
        txid: tx.txid,
        network: "bitcoin",
        block_height: tx.status.block_height || null,
        block_timestamp: tx.status.block_time ? new Date(tx.status.block_time * 1000).toISOString() : null,
        inputs: JSON.stringify(tx.vin.map((inp) => ({
          txid: inp.txid, vout: inp.vout, value: inp.prevout?.value || 0,
          address: inp.prevout?.scriptpubkey_address || "",
        }))),
        outputs: JSON.stringify(tx.vout.map((o, idx) => ({
          index: idx, value: o.value, address: o.scriptpubkey_address || "",
        }))),
        amount: amountBtc,
        fee: feeBtc,
        fee_usd: 0,
        category,
        is_internal_transfer: isInternal,
        created_at: now,
        updated_at: now,
      });
    }

    if (newTxs.length > 0) await db.transactions.bulkAdd(newTxs);

    // Update wallet
    await db.wallets.update(walletId, {
      balance: balanceBtc,
      sync_status: "idle",
      last_synced_at: now,
      sync_error: undefined,
    });

    clearTimeout(timeoutId);
    return { success: true, newTransactions: newTxs.length, balance: balanceBtc, addressCount: addressDataMap.size };
  } catch (err) {
    clearTimeout(timeoutId);
    const errorMessage = err instanceof DOMException && err.name === "AbortError"
      ? "Sync timed out" : err instanceof Error ? err.message : "Unknown error";

    await db.wallets.update(walletId, { sync_status: "error", sync_error: errorMessage });
    return { success: false, newTransactions: 0, balance: 0, error: errorMessage };
  }
}
