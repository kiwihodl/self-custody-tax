---
name: satsAt:db-design
description: This skill should be used when the user asks to 'design a database schema', 'create a table', 'database migration', 'Supabase schema', or mentions 'data model'. It provides database design guidance using Supabase/PostgreSQL for SatsAt.
version: 1.0.0
---

# Database Design

You are designing database schemas for SatsAt using Supabase (PostgreSQL). Focus on data integrity, security, and query performance.

## Design Principles

### 1. Row Level Security First

Every table with user data MUST have RLS:

```sql
-- Always enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Policy pattern
CREATE POLICY "Users can only access own data" ON table_name
  FOR ALL USING (auth.uid() = user_id);
```

### 2. Use Proper Types for Money

```sql
-- For satoshis (Bitcoin atomic unit)
amount_sats BIGINT           -- Max: 21 million BTC in sats fits in BIGINT

-- For USD values
price_usd NUMERIC(20, 8)     -- Enough precision for crypto
cost_basis_usd NUMERIC(20, 8)

-- NEVER use FLOAT or DOUBLE for money
```

### 3. JSONB for Flexible Structures

```sql
-- Good for varying structures
multisig_config JSONB DEFAULT '{}'
inputs JSONB DEFAULT '[]'
outputs JSONB DEFAULT '[]'
settings JSONB DEFAULT '{}'
```

### 4. Timestamps with Timezone

```sql
-- Always use TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
block_timestamp TIMESTAMPTZ  -- For blockchain transactions
```

---

## SatsAt Core Schema

### user_profiles

```sql
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  subscription_tier TEXT DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'holder', 'sovereign', 'advisor')),
  subscription_expires_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings JSONB structure:
-- {
--   "default_currency": "USD",
--   "cost_basis_method": "FIFO",
--   "tax_year_start": "01-01",
--   "timezone": "America/New_York"
-- }

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = id);
```

### wallets

```sql
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('single_sig', 'multisig', 'collaborative', 'exchange', 'stablecoin')),
  network TEXT NOT NULL CHECK (network IN ('bitcoin', 'ethereum', 'tron')),

  -- Bitcoin wallets
  xpub TEXT,
  derivation_path TEXT,            -- e.g., "m/84'/0'/0'"

  -- Ethereum/stablecoin wallets
  address TEXT,

  -- Multisig configuration
  multisig_config JSONB,
  -- {
  --   "quorum_required": 2,
  --   "total_keys": 3,
  --   "provider": "unchained"
  -- }

  -- Sync status
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
  sync_error TEXT,

  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_wallets_xpub ON public.wallets(xpub) WHERE xpub IS NOT NULL;
CREATE INDEX idx_wallets_address ON public.wallets(address) WHERE address IS NOT NULL;

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own wallets" ON public.wallets
  FOR ALL USING (auth.uid() = user_id);
```

### transactions

```sql
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,

  -- Blockchain data
  txid TEXT NOT NULL,
  network TEXT NOT NULL,
  block_height INTEGER,
  block_timestamp TIMESTAMPTZ,

  -- Bitcoin UTXO data
  inputs JSONB DEFAULT '[]',
  -- [{ "txid": "...", "vout": 0, "address": "...", "value_sats": 100000 }]

  outputs JSONB DEFAULT '[]',
  -- [{ "index": 0, "address": "...", "value_sats": 100000, "is_ours": true, "is_spent": false }]

  -- Ethereum/stablecoin data
  from_address TEXT,
  to_address TEXT,
  amount TEXT,                     -- String for precision
  token_contract TEXT,

  -- Fees
  fee TEXT,                        -- In native units (sats for BTC)
  fee_usd NUMERIC(20, 8),

  -- User categorization
  category TEXT DEFAULT 'receive'
    CHECK (category IN ('receive', 'send', 'internal', 'fee', 'income', 'mining', 'interest', 'airdrop')),
  is_internal_transfer BOOLEAN DEFAULT FALSE,
  linked_transaction_id UUID REFERENCES public.transactions(id),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, txid, network)
);

-- Indexes for common queries
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX idx_transactions_block_timestamp ON public.transactions(block_timestamp);
CREATE INDEX idx_transactions_category ON public.transactions(category);
CREATE INDEX idx_transactions_txid ON public.transactions(txid);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id);
```

### tax_lots

```sql
CREATE TABLE public.tax_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,

  -- What was acquired
  asset TEXT NOT NULL CHECK (asset IN ('BTC', 'USDT', 'USDC')),
  amount TEXT NOT NULL,            -- Full precision string

  -- UTXO reference (for Bitcoin)
  txid TEXT,
  vout INTEGER,

  -- Acquisition details
  acquisition_date TIMESTAMPTZ NOT NULL,
  acquisition_price_usd NUMERIC(20, 8) NOT NULL,
  cost_basis_usd NUMERIC(20, 8) NOT NULL,
  acquisition_type TEXT NOT NULL
    CHECK (acquisition_type IN ('purchase', 'income', 'gift', 'mining', 'interest', 'airdrop')),

  -- Disposal details
  is_disposed BOOLEAN DEFAULT FALSE,
  disposal_date TIMESTAMPTZ,
  disposal_price_usd NUMERIC(20, 8),
  disposal_transaction_id UUID REFERENCES public.transactions(id),
  proceeds_usd NUMERIC(20, 8),
  gain_loss_usd NUMERIC(20, 8),
  is_long_term BOOLEAN,            -- > 1 year holding

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tax_lots_user_id ON public.tax_lots(user_id);
CREATE INDEX idx_tax_lots_asset ON public.tax_lots(asset);
CREATE INDEX idx_tax_lots_is_disposed ON public.tax_lots(is_disposed);
CREATE INDEX idx_tax_lots_disposal_date ON public.tax_lots(disposal_date) WHERE disposal_date IS NOT NULL;
CREATE INDEX idx_tax_lots_acquisition_date ON public.tax_lots(acquisition_date);

ALTER TABLE public.tax_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own tax lots" ON public.tax_lots
  FOR ALL USING (auth.uid() = user_id);
```

### price_cache

```sql
CREATE TABLE public.price_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset TEXT NOT NULL CHECK (asset IN ('BTC', 'ETH', 'USDT', 'USDC')),
  date DATE NOT NULL,
  price_usd NUMERIC(20, 8) NOT NULL,
  source TEXT NOT NULL DEFAULT 'coingecko',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(asset, date)
);

-- Index for lookups
CREATE INDEX idx_price_cache_asset_date ON public.price_cache(asset, date);

-- No RLS needed - prices are public data
```

---

## Migration Best Practices

### Creating a Migration

```bash
# Create migration file
npx supabase migration new add_wallet_labels

# Edit the migration in supabase/migrations/[timestamp]_add_wallet_labels.sql
```

### Migration Template

```sql
-- Migration: [description]
-- Created: [date]

-- Up migration
BEGIN;

-- Add new column
ALTER TABLE public.wallets
ADD COLUMN label TEXT;

-- Add index if needed
CREATE INDEX idx_wallets_label ON public.wallets(label);

COMMIT;

-- To rollback, create a new migration with:
-- ALTER TABLE public.wallets DROP COLUMN label;
```

### Schema Changes Checklist

- [ ] RLS policy updated if needed
- [ ] Indexes added for query patterns
- [ ] NOT NULL constraints considered
- [ ] Default values set appropriately
- [ ] Foreign keys with proper ON DELETE
- [ ] Types match application code

---

## Query Patterns

### Get User's Portfolio Summary

```sql
SELECT
  w.id,
  w.name,
  w.type,
  w.network,
  COUNT(t.id) as transaction_count,
  SUM(CASE WHEN tl.is_disposed = false THEN CAST(tl.amount AS NUMERIC) ELSE 0 END) as balance
FROM wallets w
LEFT JOIN transactions t ON t.wallet_id = w.id
LEFT JOIN tax_lots tl ON tl.wallet_id = w.id
WHERE w.user_id = :user_id AND w.is_deleted = false
GROUP BY w.id;
```

### Get Tax Summary for Year

```sql
SELECT
  CASE WHEN is_long_term THEN 'long_term' ELSE 'short_term' END as term,
  SUM(proceeds_usd) as total_proceeds,
  SUM(cost_basis_usd) as total_cost_basis,
  SUM(gain_loss_usd) as total_gain_loss,
  COUNT(*) as disposal_count
FROM tax_lots
WHERE user_id = :user_id
  AND is_disposed = true
  AND EXTRACT(YEAR FROM disposal_date) = :year
GROUP BY is_long_term;
```

### Get Available Tax Lots (for disposal)

```sql
SELECT *
FROM tax_lots
WHERE user_id = :user_id
  AND asset = :asset
  AND is_disposed = false
ORDER BY acquisition_date ASC;  -- FIFO
-- ORDER BY acquisition_date DESC;  -- LIFO
-- ORDER BY acquisition_price_usd DESC;  -- HIFO
```

---

## Supabase-Specific Patterns

### Generate TypeScript Types

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

### Using Generated Types

```typescript
import { Database } from '@/types/database';

type Wallet = Database['public']['Tables']['wallets']['Row'];
type WalletInsert = Database['public']['Tables']['wallets']['Insert'];
type WalletUpdate = Database['public']['Tables']['wallets']['Update'];
```

### Realtime Subscriptions

```typescript
// Subscribe to wallet sync updates
supabase
  .channel('wallet-sync')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'wallets',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    console.log('Wallet updated:', payload);
  })
  .subscribe();
```

---

## Common Mistakes to Avoid

1. **Forgetting RLS** - Every user table needs Row Level Security
2. **Using FLOAT for money** - Use NUMERIC or BIGINT
3. **Missing indexes** - Add indexes for WHERE and ORDER BY columns
4. **Storing private keys** - NEVER, only xpubs/addresses
5. **Not handling nulls** - Use COALESCE or proper null checks
6. **UUID collisions** - Use gen_random_uuid(), not client-generated
