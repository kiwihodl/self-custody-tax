-- Migration: 005_api_keys.sql
-- Description: Add API keys for Advisor tier users
-- Date: 2026-01-11

-- API Keys table for public API access
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,  -- SHA-256 hash of full key
  key_prefix TEXT NOT NULL, -- First 8 chars for identification (sct_live)
  scopes TEXT[] DEFAULT ARRAY['read'],
  rate_limit_daily INTEGER DEFAULT 1000,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_prefix CHECK (LENGTH(key_prefix) >= 8)
);

-- API request log for rate limiting and analytics
CREATE TABLE IF NOT EXISTS public.api_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_requests_key_date ON public.api_requests(api_key_id, created_at);
CREATE INDEX IF NOT EXISTS idx_api_requests_user_date ON public.api_requests(user_id, created_at);

-- Enable Row Level Security
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
CREATE POLICY "Users can view their own API keys"
  ON public.api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
  ON public.api_keys
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
  ON public.api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for api_requests (users can view their own request history)
CREATE POLICY "Users can view their own API requests"
  ON public.api_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert requests (for logging from API middleware)
-- No INSERT policy for regular users - only service role inserts

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS api_keys_updated_at ON public.api_keys;
CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();

-- Comment on tables
COMMENT ON TABLE public.api_keys IS 'API keys for programmatic access (Advisor tier only)';
COMMENT ON TABLE public.api_requests IS 'Log of API requests for rate limiting and analytics';
COMMENT ON COLUMN public.api_keys.key_hash IS 'SHA-256 hash of the full API key';
COMMENT ON COLUMN public.api_keys.key_prefix IS 'First 8 characters of key (e.g., sct_live) for identification';
COMMENT ON COLUMN public.api_keys.scopes IS 'Array of permission scopes: read, write';
