-- Add export fee payment tracking to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS has_paid_export_fee BOOLEAN DEFAULT FALSE;

-- Add index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_export_fee
ON public.user_profiles(id, has_paid_export_fee)
WHERE has_paid_export_fee = TRUE;

-- Comment for clarity
COMMENT ON COLUMN public.user_profiles.has_paid_export_fee IS
'Whether the user has paid the one-time $21 export fee (only required for free tier)';
