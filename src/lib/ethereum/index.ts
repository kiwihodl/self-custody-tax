/**
 * Ethereum stablecoin support
 *
 * Provides USDT and USDC tracking via Etherscan API
 */

export {
  TOKEN_CONTRACTS,
  TOKEN_DECIMALS,
  isValidEthereumAddress,
  formatTokenAmount,
  getTokenBalance,
  getAllTokenBalances,
  getTokenTransactions,
  getAllTokenTransactions,
  categorizeTokenTransaction,
  type TokenBalance,
  type TokenTransaction,
} from "./etherscan";

export { syncEthereumWallet, type EthereumSyncResult } from "./sync";

export {
  syncEthereumWalletClient,
  type EthereumClientSyncResult,
} from "./clientSync";
