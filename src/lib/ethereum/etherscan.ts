/**
 * Etherscan API client for Ethereum stablecoin (USDT/USDC) tracking
 *
 * API docs: https://docs.etherscan.io/
 * Rate limits: 5 calls/second on free tier
 */

// ERC-20 token contract addresses on Ethereum mainnet
export const TOKEN_CONTRACTS = {
  USDT: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
} as const;

// Token decimals (both USDT and USDC use 6)
export const TOKEN_DECIMALS = {
  USDT: 6,
  USDC: 6,
} as const;

// Rate limiting: 200ms between requests (5 req/sec)
const REQUEST_DELAY_MS = 200;
let lastRequestTime = 0;

export interface EtherscanTokenTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
  gasPrice: string;
  gasUsed: string;
}

export interface EtherscanBalanceResult {
  status: string;
  message: string;
  result: string;
}

export interface EtherscanTxListResult {
  status: string;
  message: string;
  result: EtherscanTokenTx[];
}

export interface TokenBalance {
  token: "USDT" | "USDC";
  balance: string;
  balanceRaw: string;
}

export interface TokenTransaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  valueRaw: string;
  token: "USDT" | "USDC";
  gasUsed: string;
  gasPrice: string;
}

/**
 * Rate-limited delay
 */
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
}

/**
 * Validate Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Convert raw token amount to human-readable format
 */
export function formatTokenAmount(rawAmount: string, decimals: number): string {
  const divisor = Math.pow(10, decimals);
  const amount = BigInt(rawAmount) / BigInt(divisor);
  const remainder = BigInt(rawAmount) % BigInt(divisor);

  const intPart = amount.toString();
  const fracPart = remainder.toString().padStart(decimals, "0");

  return `${intPart}.${fracPart}`;
}

/**
 * Get ERC-20 token balance for an address
 */
export async function getTokenBalance(
  address: string,
  token: "USDT" | "USDC"
): Promise<TokenBalance | null> {
  if (!isValidEthereumAddress(address)) {
    console.error(`[Etherscan] Invalid address: ${address}`);
    return null;
  }

  await rateLimit();

  const contractAddress = TOKEN_CONTRACTS[token];
  const url = `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest`;

  try {
    console.log(`[Etherscan] Fetching ${token} balance for ${address.slice(0, 10)}...`);

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[Etherscan] HTTP ${response.status}`);
      return null;
    }

    const data: EtherscanBalanceResult = await response.json();

    if (data.status !== "1") {
      console.warn(`[Etherscan] API error: ${data.message}`);
      return null;
    }

    const decimals = TOKEN_DECIMALS[token];
    const balance = formatTokenAmount(data.result, decimals);

    console.log(`[Etherscan] ${token} balance: ${balance}`);

    return {
      token,
      balance,
      balanceRaw: data.result,
    };
  } catch (error) {
    console.error(`[Etherscan] Error fetching ${token} balance:`, error);
    return null;
  }
}

/**
 * Get all token balances for an address (USDT + USDC)
 */
export async function getAllTokenBalances(
  address: string
): Promise<TokenBalance[]> {
  const results: TokenBalance[] = [];

  for (const token of ["USDT", "USDC"] as const) {
    const balance = await getTokenBalance(address, token);
    if (balance) {
      results.push(balance);
    }
  }

  return results;
}

/**
 * Get ERC-20 token transfer transactions for an address
 */
export async function getTokenTransactions(
  address: string,
  token: "USDT" | "USDC",
  startBlock: number = 0
): Promise<TokenTransaction[]> {
  if (!isValidEthereumAddress(address)) {
    console.error(`[Etherscan] Invalid address: ${address}`);
    return [];
  }

  await rateLimit();

  const contractAddress = TOKEN_CONTRACTS[token];
  const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${contractAddress}&address=${address}&startblock=${startBlock}&endblock=99999999&sort=asc`;

  try {
    console.log(`[Etherscan] Fetching ${token} transactions for ${address.slice(0, 10)}...`);

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[Etherscan] HTTP ${response.status}`);
      return [];
    }

    const data: EtherscanTxListResult = await response.json();

    if (data.status !== "1") {
      // Status 0 with "No transactions found" is valid
      if (data.message === "No transactions found" || data.result.length === 0) {
        console.log(`[Etherscan] No ${token} transactions found`);
        return [];
      }
      console.warn(`[Etherscan] API error: ${data.message}`);
      return [];
    }

    const decimals = TOKEN_DECIMALS[token];
    const transactions: TokenTransaction[] = data.result.map((tx) => ({
      hash: tx.hash,
      blockNumber: parseInt(tx.blockNumber, 10),
      timestamp: parseInt(tx.timeStamp, 10),
      from: tx.from.toLowerCase(),
      to: tx.to.toLowerCase(),
      value: formatTokenAmount(tx.value, decimals),
      valueRaw: tx.value,
      token,
      gasUsed: tx.gasUsed,
      gasPrice: tx.gasPrice,
    }));

    console.log(`[Etherscan] Found ${transactions.length} ${token} transactions`);

    return transactions;
  } catch (error) {
    console.error(`[Etherscan] Error fetching ${token} transactions:`, error);
    return [];
  }
}

/**
 * Get all token transactions for an address (USDT + USDC combined)
 */
export async function getAllTokenTransactions(
  address: string,
  startBlock: number = 0
): Promise<TokenTransaction[]> {
  const allTxs: TokenTransaction[] = [];

  for (const token of ["USDT", "USDC"] as const) {
    const txs = await getTokenTransactions(address, token, startBlock);
    allTxs.push(...txs);
  }

  // Sort by timestamp
  allTxs.sort((a, b) => a.timestamp - b.timestamp);

  return allTxs;
}

/**
 * Determine if a transaction is incoming or outgoing for an address
 */
export function categorizeTokenTransaction(
  tx: TokenTransaction,
  userAddress: string
): "receive" | "send" {
  const normalizedUser = userAddress.toLowerCase();
  const normalizedTo = tx.to.toLowerCase();

  return normalizedTo === normalizedUser ? "receive" : "send";
}
