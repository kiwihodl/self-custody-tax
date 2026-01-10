-- Add cost basis override support to tax_lots table
-- This allows users to manually correct cost basis when exchange
-- purchase dates differ from on-chain receive dates

-- Add flag to indicate if cost basis was manually overridden
ALTER TABLE public.tax_lots
ADD COLUMN IF NOT EXISTS is_cost_basis_override BOOLEAN DEFAULT FALSE;

-- Add optional notes for explaining the override
ALTER TABLE public.tax_lots
ADD COLUMN IF NOT EXISTS cost_basis_notes TEXT;

-- Add original values for audit trail (stores auto-calculated values before override)
ALTER TABLE public.tax_lots
ADD COLUMN IF NOT EXISTS original_acquisition_price_usd NUMERIC(20, 8);

ALTER TABLE public.tax_lots
ADD COLUMN IF NOT EXISTS original_cost_basis_usd NUMERIC(20, 8);

-- Create index for filtering overridden lots
CREATE INDEX IF NOT EXISTS idx_tax_lots_override
ON public.tax_lots(user_id, is_cost_basis_override)
WHERE is_cost_basis_override = TRUE;

COMMENT ON COLUMN public.tax_lots.is_cost_basis_override IS 'True if user manually edited the cost basis';
COMMENT ON COLUMN public.tax_lots.cost_basis_notes IS 'User notes explaining the cost basis override';
COMMENT ON COLUMN public.tax_lots.original_acquisition_price_usd IS 'Original auto-calculated price before override';
COMMENT ON COLUMN public.tax_lots.original_cost_basis_usd IS 'Original auto-calculated cost basis before override';
