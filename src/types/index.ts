// SatsAt Core Types
// Based on ROADMAP.md specification

// ============================================
// User Types
// ============================================

export type SubscriptionTier = 'free' | 'holder' | 'sovereign' | 'advisor';
export type CostBasisMethod = 'FIFO' | 'LIFO' | 'HIFO';

export interface UserSettings {
  default_currency: 'USD' | 'AUD';
  cost_basis_method: CostBasisMethod;
  tax_year_start: string; // "01-01" for US, "07-01" for AUS
  timezone: string;
}

export interface UserProfile {
  id: string;
  email: string;
  subscription_tier: SubscriptionTier;
  subscription_expires_at: string | null;
  settings: UserSettings;
  created_at: string;
  updated_at: string;
}

// ============================================
// Wallet Types
// ============================================

export type WalletType =
  | 'single_sig'      // Standard single-signature
  | 'multisig'        // Native multisig (any quorum)
  | 'collaborative'   // Unchained, Casa, etc.
  | 'exchange'        // Exchange account (CSV import only)
  | 'stablecoin';     // USDT/USDC wallet

export type Network = 'bitcoin' | 'ethereum' | 'tron';
export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface MultisigConfig {
  descriptor: string;          // Full wallet descriptor
  quorum_required: number;     // e.g., 2
  total_keys: number;          // e.g., 3
  address_type: string;        // p2wsh, p2sh-p2wsh, etc.
  xpubs: {
    fingerprint: string;
    derivationPath: string;
    xpub: string;
  }[];
  provider?: 'unchained' | 'casa' | 'sparrow' | 'custom';
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  type: WalletType;
  network: Network;

  // For Bitcoin wallets
  xpub?: string;
  derivation_path?: string;  // e.g., "m/84'/0'/0'"

  // For multisig wallets
  multisig_config?: MultisigConfig;

  // For Ethereum/stablecoin wallets
  address?: string;

  // Balance (synced from blockchain)
  balance: number | null;

  // Metadata
  last_synced_at: string | null;
  sync_status: SyncStatus;
  sync_error?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletWithBalance extends Wallet {
  balance: number;           // Current balance in native units
  balance_usd: number;
  transaction_count: number;
}

// ============================================
// Transaction Types
// ============================================

export type TransactionCategory =
  | 'receive'           // Incoming (purchase, income, gift received)
  | 'send'              // Outgoing (sale, spend, gift sent)
  | 'internal'          // Between own wallets
  | 'fee'               // Fee-only transaction
  | 'income'            // Payment for services
  | 'mining'            // Mining reward
  | 'interest'          // Interest/yield received
  | 'airdrop';          // Airdrop received

export interface TransactionInput {
  txid: string;           // Previous transaction
  vout: number;           // Output index
  address: string;
  value_sats: number;
  tax_lot_id?: string;    // If spending our UTXO
}

export interface TransactionOutput {
  index: number;
  address: string;
  value_sats: number;
  is_ours: boolean;
  is_spent: boolean;
  spent_in_txid?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;

  // Chain data
  txid: string;
  network: Network;
  block_height: number | null;
  block_timestamp: string | null;

  // For Bitcoin: UTXO-level detail
  inputs: TransactionInput[];
  outputs: TransactionOutput[];

  // For Ethereum/stablecoins
  from_address?: string;
  to_address?: string;
  amount?: string;
  token_contract?: string;

  // Calculated fields
  fee: string;
  fee_usd: number;

  // User categorization
  category: TransactionCategory;
  is_internal_transfer: boolean;
  linked_transaction_id?: string;
  notes?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

// ============================================
// Asset & Category Types
// ============================================

// All supported assets
export type Asset = 'BTC' | 'ETH' | 'USDT' | 'USDC';

// Asset categories for UI grouping
// - Bitcoin: Standalone (the OG, not grouped with alts)
// - Crypto: Other cryptocurrencies (ETH, future: SOL, etc.)
// - Stablecoins: USD-pegged tokens (USDT, USDC)
export type AssetCategory = 'bitcoin' | 'crypto' | 'stablecoins';

// Helper to get category for an asset
export function getAssetCategory(asset: Asset): AssetCategory {
  switch (asset) {
    case 'BTC':
      return 'bitcoin';
    case 'ETH':
      return 'crypto';
    case 'USDT':
    case 'USDC':
      return 'stablecoins';
  }
}

// Helper to get assets in a category
export function getAssetsInCategory(category: AssetCategory): Asset[] {
  switch (category) {
    case 'bitcoin':
      return ['BTC'];
    case 'crypto':
      return ['ETH'];
    case 'stablecoins':
      return ['USDT', 'USDC'];
  }
}

// Category display info
export const ASSET_CATEGORY_INFO: Record<AssetCategory, { name: string; color: string; icon: string }> = {
  bitcoin: { name: 'Bitcoin', color: 'primary', icon: 'bitcoin' },
  crypto: { name: 'Crypto', color: 'purple', icon: 'ethereum' },
  stablecoins: { name: 'Stablecoins', color: 'info', icon: 'dollar' },
};

// ============================================
// Tax Lot Types
// ============================================

export type AcquisitionType = 'purchase' | 'income' | 'gift' | 'mining' | 'interest' | 'airdrop';

export interface TaxLot {
  id: string;
  user_id: string;
  wallet_id: string;
  transaction_id: string;

  // What was acquired
  asset: Asset;
  amount: string;

  // For Bitcoin: UTXO reference
  txid?: string;
  vout?: number;

  // Cost basis
  acquisition_date: string;
  acquisition_price_usd: number;
  cost_basis_usd: number;
  acquisition_type: AcquisitionType;

  // Cost basis override (for manual corrections)
  is_cost_basis_override?: boolean;
  cost_basis_notes?: string;
  original_acquisition_price_usd?: number;
  original_cost_basis_usd?: number;

  // Disposal (if sold/spent)
  is_disposed: boolean;
  disposal_date?: string;
  disposal_price_usd?: number;
  disposal_transaction_id?: string;
  proceeds_usd?: number;
  gain_loss_usd?: number;
  is_long_term?: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
}

// ============================================
// Price Types
// ============================================

export interface PriceCache {
  id: string;
  asset: Asset | 'ETH';
  date: string;  // YYYY-MM-DD
  price_usd: number;
  source: 'coingecko' | 'manual';
  created_at: string;
}

// ============================================
// Tax Report Types
// ============================================

export interface TaxSummary {
  year: number;
  method: CostBasisMethod;

  short_term: {
    proceeds: number;
    cost_basis: number;
    gain_loss: number;
    transaction_count: number;
  };

  long_term: {
    proceeds: number;
    cost_basis: number;
    gain_loss: number;
    transaction_count: number;
  };

  income: {
    total: number;
    by_type: Record<string, number>;
  };

  fees_paid: number;
}

export interface DisposalResult {
  lots_used: {
    lot_id: string;
    amount_used: string;
    cost_basis: number;
    acquisition_date: string;
    is_long_term: boolean;
  }[];
  total_cost_basis: number;
  total_proceeds: number;
  gain_loss: number;
}

// ============================================
// API Types
// ============================================

export interface AddWalletRequest {
  name: string;
  type: WalletType;
  network: Network;
  xpub?: string;
  address?: string;
  multisig_config?: MultisigConfig;
}

export interface SyncResponse {
  status: 'started' | 'already_syncing';
  transactions_found?: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
