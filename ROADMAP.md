# Self Custody Tax: Technical Specification & Business Plan

**Version:** 1.0  
**Date:** January 9, 2026  
**Status:** Pre-Development  

---

## Executive Summary

Self Custody Tax is a Bitcoin and stablecoin portfolio tracker designed for serious self-custody users with complex wallet setups. Unlike generic crypto tax tools (Koinly, CoinTracker), Self Custody Tax understands multisig architectures, collaborative custody providers, and the specific needs of users who prioritize sovereignty over convenience.

**Core Differentiator:** Native understanding of multisig wallets (2-of-3, 3-of-5), collaborative custody setups (Unchained, Casa), and proper UTXO-level cost basis tracking.

**Target Market:** Mass affluent Bitcoin holders ($100K-$5M in crypto), high-net-worth individuals with complex setups, and financial advisors/accountants serving Bitcoin clients.

**Business Model:** Freemium SaaS with tiered pricing based on portfolio complexity and features.

**Technical Stack:** Next.js, TypeScript, Supabase, Tailwind CSS, deployed on Vercel.

---

## Part 1: Business Plan

### 1.1 Problem Statement

Bitcoin holders with self-custody setups face three critical problems:

1. **No tool understands multisig.** Existing portfolio trackers treat every address as a single-sig wallet. Users with 2-of-3 multisig (the recommended security setup) cannot accurately track their holdings without manual workarounds.

2. **Cost basis tracking is broken for self-custody.** Moving coins between your own wallets (cold storage rotation, multisig migrations) creates false "disposal events" in existing tools. Users waste hours manually excluding internal transfers.

3. **Tax tools are designed for traders, not holders.** Koinly and CoinTracker optimize for high-frequency trading across dozens of exchanges. Long-term Bitcoin holders with 10 transactions per year pay the same price and get feature bloat they don't need.

### 1.2 Solution

Self Custody Tax is purpose-built for Bitcoin self-custody:

- **Multisig-native:** Understands that a 2-of-3 wallet is ONE wallet, not three addresses
- **Internal transfer detection:** Automatically identifies moves between your own wallets
- **UTXO-level tracking:** Proper cost basis per unspent output, not just per wallet
- **Collaborative custody support:** First-class integration with Unchained and Casa wallet structures
- **Stablecoin support:** USDT and USDC tracking for users who hold both BTC and stable reserves

### 1.3 Target Customer Segments

**Segment 1: Sophisticated Self-Custody Users**
- $100K-$1M in Bitcoin
- Use hardware wallets + multisig
- 5-50 transactions per year
- Technically competent but hate spreadsheets
- Pain point: No tool "gets" their setup

**Segment 2: High-Net-Worth Individuals**
- $1M-$10M+ in Bitcoin
- Multiple wallet types (hot, cold, multisig, exchange residual)
- May use collaborative custody (Unchained, Casa)
- Often work with accountants/advisors
- Pain point: Complexity is a tax nightmare

**Segment 3: Financial Advisors & Accountants**
- Serve 5-50+ Bitcoin clients
- Need consolidated reporting across client portfolios
- Require audit-ready documentation
- Pain point: Existing tools don't support their workflow

### 1.4 Competitive Landscape

| Feature | Koinly | CoinTracker | Self Custody Tax |
|---------|--------|-------------|------------|
| Multisig support | ❌ | ❌ | ✅ Native |
| UTXO tracking | ❌ | ❌ | ✅ |
| Internal transfer detection | Partial | Partial | ✅ Automatic |
| Collaborative custody | ❌ | ❌ | ✅ |
| Target user | Traders | Traders | Holders |
| Free tier | 10K txns | 25 txns | 3 wallets |
| Starting price | $49/yr | $59/yr | $99/yr |

**Competitive moat:** Deep understanding of Bitcoin-specific infrastructure that generic multi-chain tools won't prioritize. As multisig adoption grows (driven by security awareness), this moat deepens.

### 1.5 Revenue Model

**Freemium tiers:**

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | 3 wallets, 100 transactions, basic portfolio view |
| **Holder** | $99/year | 10 wallets, unlimited transactions, tax reports, cost basis methods |
| **Sovereign** | $249/year | Unlimited wallets, multisig support, internal transfer detection, priority support |
| **Advisor** | $499/year | Multi-client dashboard, white-label reports, API access |

**Revenue projections (Year 1):**
- 1,000 free users → 100 paid conversions (10%)
- Mix: 60 Holder ($5,940) + 30 Sovereign ($7,470) + 10 Advisor ($4,990)
- **Year 1 ARR: ~$18,400**

**Revenue projections (Year 2 with growth):**
- 10,000 free users → 800 paid conversions (8%)
- Mix: 480 Holder + 240 Sovereign + 80 Advisor
- **Year 2 ARR: ~$147,000**

### 1.6 Go-to-Market Strategy

**Phase 1: Founder-led sales (Months 1-3)**
- Personally onboard first 20-50 users via calls
- Source from Bitcoin Twitter, Reddit r/Bitcoin, Bitcoin-focused Discord/Telegram
- Offer free Sovereign tier in exchange for detailed feedback + testimonial
- Goal: Validate product-market fit, identify bugs, collect social proof

**Phase 2: Content marketing (Months 3-6)**
- Publish guides: "How to Track Your Multisig Wallet for Taxes"
- SEO targeting: "bitcoin cost basis calculator", "multisig tax tracking", "unchained tax reporting"
- Guest posts on Bitcoin-focused publications (Bitcoin Magazine, etc.)
- Goal: Organic traffic, establish authority

**Phase 3: Partnership development (Months 6-12)**
- Integration partnerships with Unchained, Casa (they need this tool for their customers)
- Referral program with Bitcoin-focused accountants/tax preparers
- Cross-sell from Bitcoin Butlers consultations
- Goal: Distribution channels beyond direct acquisition

### 1.7 Cross-Sell with Bitcoin Butlers

Self Custody Tax and Bitcoin Butlers serve the same customer at different stages:

1. **Awareness:** User discovers Bitcoin Butlers content (education)
2. **Consideration:** User books consultation with a Butler (advisory)
3. **Post-purchase:** User needs ongoing portfolio tracking (Self Custody Tax)

**Integration points:**
- Butlers recommend Self Custody Tax to clients post-consultation
- Self Custody Tax users who need setup help are referred to Butlers
- Potential: Butlers get affiliate commission on Self Custody Tax signups
- Future: Butler dashboard includes client portfolio overview (with permission)

**Separate brands, shared customer journey.**

### 1.8 Fundraising Strategy

**Target:** a16z Crypto Fund or Apps Fund  
**Stage:** Pre-seed/Seed  
**Ask:** $500K-$1M  

**Why a16z:**
- Thesis alignment: "America winning" in crypto infrastructure
- Portfolio synergy: Coinbase, Unchained relationships
- They explicitly fund solo technical founders via Speedrun

**Pitch angles:**
1. **Infrastructure play:** "Plaid for Bitcoin self-custody" — middleware that makes complex setups manageable
2. **Regulatory tailwind:** IRS increasing crypto enforcement = demand for compliant tracking
3. **Growing TAM:** Multisig adoption growing as security awareness increases
4. **Founder-market fit:** 5+ years Bitcoin/fintech experience, built Bitcoin Butlers, deep domain expertise

**Milestones before raising:**
- [ ] Working MVP with real user data (your own portfolio)
- [ ] 50 beta users with engagement data
- [ ] 10 paying customers (any tier)
- [ ] 3-5 testimonials from recognizable Bitcoin community members

---

## Part 2: Technical Specification

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  Next.js 14 (App Router) + TypeScript + Tailwind                │
│  - Dashboard (portfolio overview)                                │
│  - Wallets (add/manage wallets)                                  │
│  - Transactions (history, categorization)                        │
│  - Tax Reports (8949 generation)                                 │
│  - Settings (account, preferences)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER                                   │
│  Next.js API Routes + Server Actions                             │
│  - /api/wallets/* (CRUD, sync)                                   │
│  - /api/transactions/* (import, categorize)                      │
│  - /api/tax/* (calculate, export)                                │
│  - /api/prices/* (historical price lookup)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  Supabase (PostgreSQL + Auth + Storage)                          │
│  - Users, Wallets, Transactions, Tax Lots                        │
│  - Row Level Security for multi-tenant isolation                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                              │
│  - Mempool.space API (Bitcoin blockchain data)                   │
│  - Etherscan API (Ethereum USDT/USDC)                            │
│  - CoinGecko API (historical prices)                             │
│  - (Future: Tron API for USDT)                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Models

#### Core Entities

```typescript
// User (managed by Supabase Auth)
interface User {
  id: string;                    // UUID from Supabase Auth
  email: string;
  created_at: Date;
  subscription_tier: 'free' | 'holder' | 'sovereign' | 'advisor';
  subscription_expires_at: Date | null;
  settings: UserSettings;
}

interface UserSettings {
  default_currency: 'USD' | 'AUD';  // For display
  cost_basis_method: 'FIFO' | 'LIFO' | 'HIFO';
  tax_year_start: string;           // "01-01" for US, "07-01" for AUS
  timezone: string;
}

// Wallet - represents a single wallet or multisig setup
interface Wallet {
  id: string;                       // UUID
  user_id: string;                  // FK to User
  name: string;                     // User-defined label
  type: WalletType;
  network: Network;
  
  // For Bitcoin wallets
  xpub?: string;                    // Extended public key (watch-only)
  derivation_path?: string;         // e.g., "m/84'/0'/0'"
  
  // For multisig wallets
  multisig_config?: MultisigConfig;
  
  // For Ethereum/stablecoin wallets
  address?: string;                 // 0x... address
  
  // Metadata
  created_at: Date;
  last_synced_at: Date | null;
  sync_status: 'idle' | 'syncing' | 'error';
  sync_error?: string;
}

type WalletType = 
  | 'single_sig'      // Standard single-signature
  | 'multisig'        // Native multisig (any quorum)
  | 'collaborative'   // Unchained, Casa, etc.
  | 'exchange'        // Exchange account (CSV import only)
  | 'stablecoin';     // USDT/USDC wallet

type Network = 
  | 'bitcoin'
  | 'ethereum'        // For USDT/USDC on ETH
  | 'tron';           // For USDT on Tron (future)

interface MultisigConfig {
  quorum_required: number;          // e.g., 2
  total_keys: number;               // e.g., 3
  provider?: 'unchained' | 'casa' | 'sparrow' | 'custom';
}

// Transaction - a single on-chain or off-chain transaction
interface Transaction {
  id: string;                       // UUID
  user_id: string;                  // FK to User
  wallet_id: string;                // FK to Wallet
  
  // Chain data
  txid: string;                     // Transaction hash
  network: Network;
  block_height: number | null;      // null if unconfirmed
  block_timestamp: Date | null;
  
  // For Bitcoin: UTXO-level detail
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  
  // For Ethereum/stablecoins: simpler model
  from_address?: string;
  to_address?: string;
  amount?: string;                  // String for precision
  token_contract?: string;          // For ERC-20
  
  // Calculated fields
  fee: string;                      // In native units
  fee_usd: number;                  // At time of transaction
  
  // User categorization
  category: TransactionCategory;
  is_internal_transfer: boolean;    // Between user's own wallets
  linked_transaction_id?: string;   // The "other side" of internal transfer
  notes?: string;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

type TransactionCategory =
  | 'receive'           // Incoming (purchase, income, gift received)
  | 'send'              // Outgoing (sale, spend, gift sent)
  | 'internal'          // Between own wallets
  | 'fee'               // Fee-only transaction
  | 'income'            // Payment for services
  | 'mining'            // Mining reward
  | 'interest'          // Interest/yield received
  | 'airdrop';          // Airdrop received

// Bitcoin-specific: UTXO inputs/outputs
interface TransactionInput {
  txid: string;                     // Previous transaction
  vout: number;                     // Output index
  address: string;
  value_sats: number;
  
  // If this is spending our UTXO, link to the tax lot
  tax_lot_id?: string;
}

interface TransactionOutput {
  index: number;
  address: string;
  value_sats: number;
  
  // Is this output ours?
  is_ours: boolean;
  
  // If ours and unspent, this becomes a UTXO
  is_spent: boolean;
  spent_in_txid?: string;
}

// Tax Lot - for cost basis tracking
interface TaxLot {
  id: string;                       // UUID
  user_id: string;
  wallet_id: string;
  transaction_id: string;           // Acquisition transaction
  
  // What was acquired
  asset: 'BTC' | 'USDT' | 'USDC';
  amount: string;                   // Full precision
  
  // For Bitcoin: UTXO reference
  txid?: string;
  vout?: number;
  
  // Cost basis
  acquisition_date: Date;
  acquisition_price_usd: number;    // Per unit at acquisition
  cost_basis_usd: number;           // Total cost basis
  acquisition_type: 'purchase' | 'income' | 'gift' | 'mining' | 'interest' | 'airdrop';
  
  // Disposal (if sold/spent)
  is_disposed: boolean;
  disposal_date?: Date;
  disposal_price_usd?: number;
  disposal_transaction_id?: string;
  proceeds_usd?: number;
  gain_loss_usd?: number;
  is_long_term?: boolean;           // > 1 year holding
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

// Price Cache - historical prices
interface PriceCache {
  id: string;
  asset: 'BTC' | 'USDT' | 'USDC' | 'ETH';
  date: string;                     // YYYY-MM-DD
  price_usd: number;
  source: 'coingecko' | 'manual';
  created_at: Date;
}
```

### 2.3 API Design

#### Wallet Endpoints

```typescript
// POST /api/wallets
// Add a new wallet
interface AddWalletRequest {
  name: string;
  type: WalletType;
  network: Network;
  xpub?: string;                    // For Bitcoin single-sig/multisig
  address?: string;                 // For Ethereum stablecoins
  multisig_config?: MultisigConfig;
}

// GET /api/wallets
// List all user wallets
interface WalletsResponse {
  wallets: (Wallet & {
    balance: string;                // Current balance
    balance_usd: number;
    transaction_count: number;
  })[];
}

// POST /api/wallets/:id/sync
// Trigger blockchain sync for a wallet
interface SyncResponse {
  status: 'started' | 'already_syncing';
  transactions_found?: number;
}

// DELETE /api/wallets/:id
// Remove a wallet (soft delete, preserves history)
```

#### Transaction Endpoints

```typescript
// GET /api/transactions
// List transactions with filters
interface TransactionsQuery {
  wallet_id?: string;
  category?: TransactionCategory;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

// PATCH /api/transactions/:id
// Update transaction categorization
interface UpdateTransactionRequest {
  category?: TransactionCategory;
  is_internal_transfer?: boolean;
  linked_transaction_id?: string;
  notes?: string;
}

// POST /api/transactions/import
// Import from exchange CSV
interface ImportRequest {
  exchange: 'coinbase' | 'kraken' | 'binance' | 'gemini' | 'amber';
  csv_data: string;                 // Base64 encoded CSV
}
```

#### Tax Endpoints

```typescript
// GET /api/tax/summary
// Tax summary for a year
interface TaxSummaryQuery {
  year: number;
  method?: 'FIFO' | 'LIFO' | 'HIFO';
}

interface TaxSummaryResponse {
  year: number;
  method: string;
  
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

// GET /api/tax/report
// Generate downloadable tax report
interface TaxReportQuery {
  year: number;
  format: '8949' | 'csv' | 'turbotax';
}

// Returns file download
```

#### Price Endpoints

```typescript
// GET /api/prices/historical
// Get historical price
interface HistoricalPriceQuery {
  asset: 'BTC' | 'USDT' | 'USDC';
  date: string;                     // YYYY-MM-DD
}

interface HistoricalPriceResponse {
  asset: string;
  date: string;
  price_usd: number;
  source: string;
}
```

### 2.4 External API Integrations

#### Mempool.space (Bitcoin)

```typescript
// Base URL: https://mempool.space/api
//
// IMPORTANT: Mempool.space does NOT have a native xpub endpoint!
// See GitHub Issue #177 - this has been requested but not implemented.
// We must derive addresses from xpub locally and query each individually.

// Get address info (balance)
// GET /address/:address
// Returns: { chain_stats: { funded_txo_sum, spent_txo_sum }, ... }

// Get address transactions
// GET /address/:address/txs
// Returns: Transaction[]

// Get UTXO list
// GET /address/:address/utxo
// Returns: UTXO[]

// Rate limits: ~10 requests/second (aggressive 429 responses)
// Implementation notes:
// - Use AbortController for proper timeout handling
// - 1.5s delay between requests to avoid rate limiting
// - Start with 5 external + 5 change addresses (10 total)
// - Process addresses sequentially, not in parallel
// - Fetch info + txs together per address to reduce requests
```

**xpub Syncing Strategy:**

Since Mempool.space lacks native xpub support, we implement client-side BIP32 derivation:

1. **Derive addresses locally** using `@scure/bip32` and `@scure/btc-signer`
   - Support xpub (P2PKH), ypub (P2SH-SegWit), zpub (P2WPKH)
   - Derive `XPUB_GAP_LIMIT` external + change addresses

2. **Query each address** against Mempool.space API
   - Sequential requests with rate limiting (1.5s delay)
   - AbortController for 60s timeout
   - Graceful degradation on partial results

3. **Aggregate results**
   - Sum balances across all addresses
   - Deduplicate transactions by txid
   - Pass full address set to categorize() for accurate send/receive detection

**Alternative APIs (future consideration):**
- Blockbook (Trezor): Has native `/api/v2/xpub/:xpub` endpoint
- Electrum servers: Designed for wallet syncing, supports xpub queries
- Esplora (Blockstream): Similar to Mempool but may have different rate limits

#### CoinGecko (Prices)

```typescript
// Base URL: https://api.coingecko.com/api/v3

// Historical price
// GET /coins/:id/history?date=:date
// id: 'bitcoin', 'tether', 'usd-coin'
// date: DD-MM-YYYY format

// Rate limits: 10-30 calls/minute on free tier
```

#### Etherscan (Ethereum - USDT/USDC)

```typescript
// Base URL: https://api.etherscan.io/api

// Get ERC-20 token transfers
// GET ?module=account&action=tokentx&address=:address

// USDT contract: 0xdAC17F958D2ee523a2206206994597C13D831ec7
// USDC contract: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48

// Rate limits: 5 calls/second on free tier
```

### 2.5 Database Schema (Supabase)

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'holder', 'sovereign', 'advisor')),
  subscription_expires_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallets
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('single_sig', 'multisig', 'collaborative', 'exchange', 'stablecoin')),
  network TEXT NOT NULL CHECK (network IN ('bitcoin', 'ethereum', 'tron')),
  xpub TEXT,
  derivation_path TEXT,
  address TEXT,
  multisig_config JSONB,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle',
  sync_error TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  txid TEXT NOT NULL,
  network TEXT NOT NULL,
  block_height INTEGER,
  block_timestamp TIMESTAMPTZ,
  inputs JSONB DEFAULT '[]',
  outputs JSONB DEFAULT '[]',
  from_address TEXT,
  to_address TEXT,
  amount TEXT,
  token_contract TEXT,
  fee TEXT,
  fee_usd NUMERIC(20, 8),
  category TEXT DEFAULT 'receive',
  is_internal_transfer BOOLEAN DEFAULT FALSE,
  linked_transaction_id UUID REFERENCES public.transactions(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, txid, network)
);

-- Tax Lots
CREATE TABLE public.tax_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  asset TEXT NOT NULL CHECK (asset IN ('BTC', 'USDT', 'USDC')),
  amount TEXT NOT NULL,
  txid TEXT,
  vout INTEGER,
  acquisition_date TIMESTAMPTZ NOT NULL,
  acquisition_price_usd NUMERIC(20, 8) NOT NULL,
  cost_basis_usd NUMERIC(20, 8) NOT NULL,
  acquisition_type TEXT NOT NULL,
  is_disposed BOOLEAN DEFAULT FALSE,
  disposal_date TIMESTAMPTZ,
  disposal_price_usd NUMERIC(20, 8),
  disposal_transaction_id UUID REFERENCES public.transactions(id),
  proceeds_usd NUMERIC(20, 8),
  gain_loss_usd NUMERIC(20, 8),
  is_long_term BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price Cache
CREATE TABLE public.price_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset TEXT NOT NULL,
  date DATE NOT NULL,
  price_usd NUMERIC(20, 8) NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(asset, date)
);

-- Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_lots ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can only access own profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only access own wallets" ON public.wallets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own tax lots" ON public.tax_lots
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX idx_transactions_block_timestamp ON public.transactions(block_timestamp);
CREATE INDEX idx_tax_lots_user_id ON public.tax_lots(user_id);
CREATE INDEX idx_tax_lots_disposal_date ON public.tax_lots(disposal_date);
CREATE INDEX idx_price_cache_asset_date ON public.price_cache(asset, date);
```

### 2.6 Key Algorithms

#### Cost Basis Calculation (FIFO/LIFO/HIFO)

```typescript
interface DisposalResult {
  lots_used: {
    lot_id: string;
    amount_used: string;
    cost_basis: number;
    acquisition_date: Date;
    is_long_term: boolean;
  }[];
  total_cost_basis: number;
  total_proceeds: number;
  gain_loss: number;
}

function calculateDisposal(
  user_id: string,
  asset: 'BTC' | 'USDT' | 'USDC',
  amount: string,
  disposal_date: Date,
  proceeds_usd: number,
  method: 'FIFO' | 'LIFO' | 'HIFO'
): DisposalResult {
  // 1. Get all undisposed lots for this asset
  const available_lots = await getTaxLots(user_id, asset, { is_disposed: false });
  
  // 2. Sort based on method
  switch (method) {
    case 'FIFO':
      available_lots.sort((a, b) => a.acquisition_date - b.acquisition_date);
      break;
    case 'LIFO':
      available_lots.sort((a, b) => b.acquisition_date - a.acquisition_date);
      break;
    case 'HIFO':
      available_lots.sort((a, b) => b.acquisition_price_usd - a.acquisition_price_usd);
      break;
  }
  
  // 3. Consume lots until amount is satisfied
  let remaining = BigNumber(amount);
  const lots_used = [];
  
  for (const lot of available_lots) {
    if (remaining.lte(0)) break;
    
    const lot_amount = BigNumber(lot.amount);
    const amount_to_use = BigNumber.min(lot_amount, remaining);
    const proportion = amount_to_use.div(lot_amount);
    
    lots_used.push({
      lot_id: lot.id,
      amount_used: amount_to_use.toString(),
      cost_basis: lot.cost_basis_usd * proportion.toNumber(),
      acquisition_date: lot.acquisition_date,
      is_long_term: isLongTerm(lot.acquisition_date, disposal_date)
    });
    
    remaining = remaining.minus(amount_to_use);
  }
  
  // 4. Calculate totals
  const total_cost_basis = lots_used.reduce((sum, l) => sum + l.cost_basis, 0);
  const gain_loss = proceeds_usd - total_cost_basis;
  
  return {
    lots_used,
    total_cost_basis,
    total_proceeds: proceeds_usd,
    gain_loss
  };
}

function isLongTerm(acquisition: Date, disposal: Date): boolean {
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  return (disposal.getTime() - acquisition.getTime()) > oneYear;
}
```

#### Internal Transfer Detection

```typescript
async function detectInternalTransfers(user_id: string): Promise<void> {
  // Get all user's wallet addresses
  const wallets = await getWallets(user_id);
  const user_addresses = new Set<string>();
  
  for (const wallet of wallets) {
    if (wallet.address) {
      user_addresses.add(wallet.address.toLowerCase());
    }
    // For Bitcoin, get all derived addresses from xpub
    if (wallet.xpub) {
      const addresses = await deriveAddresses(wallet.xpub, wallet.derivation_path);
      addresses.forEach(a => user_addresses.add(a));
    }
  }
  
  // Find transactions where both sender and receiver are user's addresses
  const transactions = await getTransactions(user_id);
  
  for (const tx of transactions) {
    // Bitcoin: check if all inputs are ours AND at least one output is not change
    if (tx.network === 'bitcoin') {
      const all_inputs_ours = tx.inputs.every(i => user_addresses.has(i.address));
      const outputs_to_us = tx.outputs.filter(o => user_addresses.has(o.address));
      
      if (all_inputs_ours && outputs_to_us.length > 0) {
        // This is an internal transfer (or self-send)
        await markAsInternalTransfer(tx.id);
      }
    }
    
    // Ethereum: simpler - check from and to
    if (tx.network === 'ethereum') {
      if (user_addresses.has(tx.from_address?.toLowerCase()) &&
          user_addresses.has(tx.to_address?.toLowerCase())) {
        await markAsInternalTransfer(tx.id);
      }
    }
  }
}
```

### 2.7 UI/UX Structure

```
/                           → Dashboard (portfolio overview)
├── /wallets                → Wallet list
│   ├── /wallets/add        → Add wallet wizard
│   └── /wallets/:id        → Wallet detail (transactions, settings)
├── /transactions           → All transactions
│   └── /transactions/:id   → Transaction detail (edit category, notes)
├── /tax                    → Tax center
│   ├── /tax/summary        → Year summary
│   ├── /tax/lots           → Tax lot detail
│   └── /tax/export         → Export reports
├── /settings               → User settings
│   ├── /settings/account   → Account info
│   ├── /settings/preferences → Tax method, currency, etc.
│   └── /settings/subscription → Plan management
└── /auth                   → Auth pages (login, register, etc.)
```

#### Key Screens

**Dashboard:**
- Total portfolio value (BTC + stablecoins in USD)
- 24h/7d/30d/1y change
- Holdings breakdown (pie chart)
- Recent transactions
- Quick actions (add wallet, sync all, generate report)

**Wallet Detail:**
- Balance (BTC and USD)
- For multisig: show quorum (e.g., "2-of-3")
- Transaction history for this wallet
- UTXO list (for Bitcoin)
- Sync status and last synced time

**Tax Summary:**
- Year selector
- Cost basis method selector
- Short-term vs long-term gains breakdown
- Income by type
- Total tax liability estimate
- Export buttons

### 2.8 Security Considerations

1. **No private keys ever.** Only xpubs, addresses, and view-only data.

2. **Row Level Security.** All database access filtered by user_id via Supabase RLS.

3. **API rate limiting.** Prevent abuse of external API calls.

4. **Input validation.** Validate all xpubs, addresses before storing.

5. **Audit logging.** Log all data exports and tax report generations.

6. **Data encryption.** Supabase encrypts at rest. Consider additional encryption for xpubs.

---

## Part 3: Development Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Basic portfolio tracking for single Bitcoin wallet

**Deliverables:**
- [x] Next.js project setup with TypeScript, Tailwind, Supabase
- [x] Authentication (email/password via Supabase Auth)
- [x] Add Bitcoin wallet (single address or xpub import)
- [x] Sync transactions from Mempool.space (via CORS proxy)
- [x] Display portfolio balance and transaction history
- [x] Basic dashboard with total value
- [x] xpub/ypub/zpub address derivation using @scure/bip32
- [x] AbortController-based timeout for reliable sync termination

**Implementation Notes (January 2026):**
- Client-side sync to bypass Supabase auth issues with server routes
- Mempool.space has no xpub endpoint - we derive addresses locally
- Rate limiting: 1.5s delay between requests, 60s timeout
- 5 external + 5 change addresses derived per xpub (conservative to avoid 429s)

**Success criteria:** User can add their Bitcoin wallet and see accurate balance and history.

### Phase 2: Core Features (Week 3-4)

**Goal:** Tax tracking and cost basis

**Deliverables:**
- [x] Cost basis tracking (FIFO/LIFO/HIFO implementation)
- [x] Tax lot creation on receive transactions
- [x] Tax lot disposal on send transactions
- [x] Historical price fetching from CoinGecko
- [x] Price caching in Supabase
- [x] Basic tax summary page with year/method selectors
- [x] 8949 report generation (CSV format) - Full IRS Form 8949 export with Part I/II separation

**Implementation Notes (January 2026):**
- CoinGecko integration: `/src/lib/prices/coingecko.ts`
- Price cache: `/src/lib/prices/cache.ts` with Supabase storage
- Tax lots: `/src/lib/tax/lots.ts` with FIFO/LIFO/HIFO algorithms
- Tax reporting: `/src/lib/tax/reporting.ts` with summary generation
- Tax page: `/src/app/tax/page.tsx` with full UI
- API: `/api/prices` endpoint for historical price queries

**Success criteria:** User can generate accurate tax report for their Bitcoin holdings.

### Phase 3: Differentiators (Week 5-6)

**Goal:** Multisig support and internal transfer detection

**Deliverables:**
- [ ] Multisig wallet type with quorum configuration
- [ ] Internal transfer detection algorithm
- [ ] Manual transfer linking UI
- [ ] LIFO and HIFO cost basis methods
- [ ] Unrealized gains view

**Success criteria:** User with multisig setup can track without false disposal events.

### Phase 4: Stablecoins (Week 7-8)

**Goal:** USDT/USDC support

**Deliverables:**
- [ ] Ethereum wallet type
- [ ] ERC-20 transaction fetching (Etherscan)
- [ ] Stablecoin balance tracking
- [ ] Combined portfolio view (BTC + stables)

**Success criteria:** User can track both Bitcoin and stablecoin holdings.

### Phase 5: Polish & Launch (Week 9-10)

**Goal:** Production-ready for beta users

**Deliverables:**
- [ ] Exchange CSV import (Amber App priority, then Coinbase, Kraken)
- [ ] Subscription system (Stripe integration)
- [ ] Onboarding wizard
- [ ] Documentation / help center
- [ ] Error handling and edge cases
- [ ] Performance optimization
- [ ] Beta launch to 20-50 users

**Success criteria:** Real users successfully tracking portfolios and generating tax reports.

### Phase 6: Performance & Refinement (Week 11-12)

**Goal:** Optimize performance and improve reliability

**Deliverables:**
- [x] Error boundary components for graceful error handling
- [x] Loading states and skeleton screens
- [x] Caching optimization (SWR)
- [x] Bundle size optimization (removed unused deps: date-fns, react-query, react-hook-form, zod)
- [ ] Database query optimization
- [x] Rate limiting improvements (token bucket algorithm)
- [x] Retry logic with exponential backoff and jitter
- [x] Batch processing for large wallets (configurable concurrency)

**Implementation Notes (January 2026):**
- Error boundaries: `/src/components/error-boundary.tsx`, `/src/app/error.tsx`, `/src/app/global-error.tsx`
- Skeleton screens: `/src/components/skeleton.tsx` with page-specific loading.tsx files
- SWR hooks: `/src/lib/hooks/` - useWallets, useTransactions, useTaxLots, usePrices
- Rate limiter: `/src/lib/utils/rate-limiter.ts` - Token bucket + exponential backoff
- Batch processing: 3 concurrent address fetches, 500ms delay between batches

**Success criteria:** App handles edge cases gracefully and performs well with large portfolios.

### Phase 7: Monetization (Week 13-14)

**Goal:** Subscription system for revenue generation

**Deliverables:**
- [ ] Stripe integration for payments
- [ ] Subscription tiers (Free, Holder, Sovereign, Advisor)
- [ ] Usage limits enforcement (wallet count, transaction limits)
- [ ] Customer portal for subscription management
- [ ] Billing webhooks for subscription events
- [ ] Upgrade/downgrade flows
- [ ] Trial period implementation

**Success criteria:** Users can subscribe and access premium features.

---

## Part 4: Testing Strategy

### Happy Path Tests

1. **New user onboarding:**
   - Register → Add Bitcoin wallet → Sync → View balance → ✅

2. **Tax report generation:**
   - User with 1 year history → Generate 8949 → Download CSV → ✅

3. **Multisig tracking:**
   - Add 2-of-3 wallet → Sync → Internal transfers excluded → ✅

### Edge Cases (Likely)

- Empty wallet (0 balance, 0 transactions)
- Wallet with unconfirmed transactions
- Very old wallet (1000+ transactions)
- Duplicate transaction import (CSV + on-chain)
- Network timeout during sync

### Edge Cases (Damaging)

- Incorrect cost basis calculation (tax liability)
- Lost transactions during sync failure
- Price data unavailable for historical date
- xpub validation bypass (invalid input stored)

### Manual Verification Checklist

- [ ] User: Register and verify email
- [ ] User: Add Bitcoin wallet with real xpub
- [ ] User: Verify transaction count matches explorer
- [ ] User: Generate tax report and spot-check calculations
- [ ] User: Upgrade to paid tier (Stripe test mode)

---

## Part 5: Handoff Instructions

### For Branding/SEO AI Skill

**Product name:** Self Custody Tax (open to alternatives - see naming notes above)

**Tagline candidates:**
- "Portfolio tracking for serious Bitcoiners"
- "Finally, a tracker that understands multisig"
- "Self-custody deserves better tools"

**SEO target keywords:**
- Primary: "bitcoin portfolio tracker", "bitcoin tax calculator", "crypto cost basis calculator"
- Secondary: "multisig tax tracking", "unchained tax reporting", "casa wallet taxes"
- Long-tail: "how to track multisig wallet for taxes", "bitcoin UTXO cost basis"

**Brand positioning:** Premium, security-focused, Bitcoin-first (but not maximalist toxic). Professional but approachable. Think: what Unchained would build if they made a portfolio tracker.

**Competitor sites to analyze:** koinly.io, cointracker.io, bitcointaxes.info

### For Claude Code

**Repository structure:**
```
ironledger/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities, API clients
│   ├── types/               # TypeScript interfaces
│   └── styles/              # Tailwind config, globals
├── supabase/
│   └── migrations/          # Database migrations
├── public/                  # Static assets
├── .env.example             # Environment variables template
└── package.json
```

**Key dependencies:**
```json
{
  "dependencies": {
    "next": "^14",
    "@supabase/supabase-js": "^2",
    "@supabase/ssr": "^0.1",
    "@scure/bip32": "^2",
    "@scure/btc-signer": "^2",
    "@bitcoinerlab/descriptors": "^2",
    "bignumber.js": "^9",
    "swr": "^2"
  }
}
```

**Environment variables needed:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
COINGECKO_API_KEY=           # Optional, increases rate limit
ETHERSCAN_API_KEY=           # Required for stablecoins
```

**Start with:** Phase 1 deliverables. Get basic Bitcoin wallet tracking working before adding complexity.

### For QA Testing AI Skill

**Test environment:** Vercel preview deployments + Supabase staging project

**Test data needed:**
- Bitcoin testnet wallet (or mainnet watch-only with known history)
- Sample exchange CSVs (Amber App format priority)
- Edge case scenarios (listed in Testing Strategy)

**Critical paths to test:**
1. User registration → wallet add → sync → balance accuracy
2. Transaction categorization → tax lot creation → disposal tracking
3. Tax report generation → CSV download → data accuracy

---

## Appendix A: AmberApp CSV Format

Priority import format based on your exchange history:

```csv
Date,Type,Asset,Amount,Fee,Fee Asset,Price,Value
2024-01-15T10:30:00Z,buy,BTC,0.05,0.0001,BTC,42000.00,2100.00
2024-02-20T14:45:00Z,sell,BTC,0.02,0.00005,BTC,48000.00,960.00
```

**Mapping:**
- `Type: buy` → category: receive, acquisition_type: purchase
- `Type: sell` → category: send, triggers disposal
- `Fee` → included in cost basis for buys, deducted from proceeds for sells

---

## Appendix B: IRS 8949 Format

Required columns for US tax reporting:

```csv
Description,Date Acquired,Date Sold,Proceeds,Cost Basis,Gain or Loss
0.05 BTC,01/15/2024,02/20/2024,960.00,1050.00,-90.00
```

**Categorization:**
- Part I: Short-term (held ≤ 1 year)
- Part II: Long-term (held > 1 year)

**Box codes:**
- Box A: Short-term, reported to IRS (exchange sales)
- Box B: Short-term, not reported to IRS (self-custody sales)
- Box D: Long-term, reported to IRS
- Box E: Long-term, not reported to IRS

---

## Appendix C: Naming Alternatives

If "Self Custody Tax" has issues (Ledger trademark confusion):

| Name | Domain | Pros | Cons |
|------|--------|------|------|
| Self Custody Tax | ironledger.io | Strong brand, memorable | Ledger confusion |
| VaultTrack | vaulttrack.io | Security + tracking | Generic |
| ColdStack | coldstack.io | Cold storage + portfolio | Might exist |
| SatStack | satstack.io | Bitcoin-native (sats) | Too niche? |
| HodlFolio | hodlfolio.com | Meme appeal, holder focus | Unprofessional? |

**Recommendation:** Check domain availability before finalizing. Self Custody Tax is fine if you can get ironledger.io or ironledger.app.
