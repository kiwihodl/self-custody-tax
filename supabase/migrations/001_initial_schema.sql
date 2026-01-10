-- SatsAt Initial Schema
-- Based on ROADMAP.md specification

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'holder', 'sovereign', 'advisor')),
  subscription_expires_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{
    "default_currency": "USD",
    "cost_basis_method": "FIFO",
    "tax_year_start": "01-01",
    "timezone": "America/New_York"
  }',
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
  sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
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
  category TEXT DEFAULT 'receive' CHECK (category IN ('receive', 'send', 'internal', 'fee', 'income', 'mining', 'interest', 'airdrop')),
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
  acquisition_type TEXT NOT NULL CHECK (acquisition_type IN ('purchase', 'income', 'gift', 'mining', 'interest', 'airdrop')),
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
  source TEXT NOT NULL CHECK (source IN ('coingecko', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(asset, date)
);

-- Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_lots ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access own data
CREATE POLICY "Users can only access own profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only access own wallets" ON public.wallets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own tax lots" ON public.tax_lots
  FOR ALL USING (auth.uid() = user_id);

-- Price cache is readable by all authenticated users
ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Price cache readable by authenticated users" ON public.price_cache
  FOR SELECT USING (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX idx_transactions_block_timestamp ON public.transactions(block_timestamp);
CREATE INDEX idx_tax_lots_user_id ON public.tax_lots(user_id);
CREATE INDEX idx_tax_lots_disposal_date ON public.tax_lots(disposal_date);
CREATE INDEX idx_tax_lots_is_disposed ON public.tax_lots(is_disposed);
CREATE INDEX idx_price_cache_asset_date ON public.price_cache(asset, date);

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tax_lots_updated_at
  BEFORE UPDATE ON public.tax_lots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
