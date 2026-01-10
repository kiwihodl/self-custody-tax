/**
 * Mempool.space API Client
 * Docs: https://mempool.space/docs/api
 * Rate limit: 10 requests/second (no API key needed)
 */

const MEMPOOL_API = "https://mempool.space/api";

export interface MempoolTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: MempoolInput[];
  vout: MempoolOutput[];
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

export interface MempoolInput {
  txid: string;
  vout: number;
  prevout: {
    scriptpubkey: string;
    scriptpubkey_address: string;
    scriptpubkey_type: string;
    value: number;
  };
  scriptsig: string;
  sequence: number;
}

export interface MempoolOutput {
  scriptpubkey: string;
  scriptpubkey_address: string;
  scriptpubkey_type: string;
  value: number;
}

export interface MempoolUTXO {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
  value: number;
}

export interface AddressInfo {
  address: string;
  chain_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
  mempool_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
}

/**
 * Get address info (balance, tx count)
 */
export async function getAddressInfo(address: string): Promise<AddressInfo> {
  const response = await fetch(`${MEMPOOL_API}/address/${address}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch address info: ${response.status}`);
  }
  return response.json();
}

/**
 * Get transactions for an address
 * Returns up to 50 transactions, use after_txid for pagination
 */
export async function getAddressTransactions(
  address: string,
  afterTxid?: string
): Promise<MempoolTransaction[]> {
  const url = afterTxid
    ? `${MEMPOOL_API}/address/${address}/txs/chain/${afterTxid}`
    : `${MEMPOOL_API}/address/${address}/txs`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.status}`);
  }
  return response.json();
}

/**
 * Get all transactions for an address (handles pagination)
 */
export async function getAllAddressTransactions(
  address: string
): Promise<MempoolTransaction[]> {
  const allTxs: MempoolTransaction[] = [];
  let lastTxid: string | undefined;

  while (true) {
    const txs = await getAddressTransactions(address, lastTxid);
    if (txs.length === 0) break;

    allTxs.push(...txs);
    lastTxid = txs[txs.length - 1].txid;

    // Safety limit
    if (allTxs.length > 10000) {
      console.warn("Transaction limit reached for address", address);
      break;
    }

    // Rate limiting - wait 100ms between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return allTxs;
}

/**
 * Get UTXOs for an address
 */
export async function getAddressUTXOs(address: string): Promise<MempoolUTXO[]> {
  const response = await fetch(`${MEMPOOL_API}/address/${address}/utxo`);
  if (!response.ok) {
    throw new Error(`Failed to fetch UTXOs: ${response.status}`);
  }
  return response.json();
}

/**
 * Get transaction details by txid
 */
export async function getTransaction(txid: string): Promise<MempoolTransaction> {
  const response = await fetch(`${MEMPOOL_API}/tx/${txid}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch transaction: ${response.status}`);
  }
  return response.json();
}

/**
 * Get current Bitcoin price in USD
 */
export async function getBitcoinPrice(): Promise<number> {
  const response = await fetch(`${MEMPOOL_API}/v1/prices`);
  if (!response.ok) {
    throw new Error(`Failed to fetch price: ${response.status}`);
  }
  const data = await response.json();
  return data.USD;
}

/**
 * Get all transactions for an xpub using the mempool.space xpub endpoint
 */
export async function getXpubTransactions(
  xpub: string
): Promise<{ transactions: MempoolTransaction[]; addresses: string[] }> {
  // Mempool.space has an xpub endpoint that returns all transactions
  const response = await fetch(`${MEMPOOL_API}/v1/xpub/${xpub}/txs`);

  if (!response.ok) {
    // Fallback: might need to derive addresses and fetch individually
    throw new Error(`Failed to fetch xpub transactions: ${response.status}`);
  }

  const data = await response.json();
  return {
    transactions: data.transactions || [],
    addresses: data.addresses || [],
  };
}

/**
 * Get xpub info (balance, addresses)
 */
export async function getXpubInfo(xpub: string): Promise<{
  balance: number;
  txCount: number;
  addresses: string[];
}> {
  const response = await fetch(`${MEMPOOL_API}/v1/xpub/${xpub}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch xpub info: ${response.status}`);
  }

  const data = await response.json();
  return {
    balance: data.chain_stats?.funded_txo_sum - data.chain_stats?.spent_txo_sum || 0,
    txCount: data.chain_stats?.tx_count || 0,
    addresses: data.addresses || [],
  };
}
