-- Add balance column to wallets table
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS balance NUMERIC(20, 8);

-- Add index for balance queries
CREATE INDEX IF NOT EXISTS idx_wallets_balance ON public.wallets(balance);
