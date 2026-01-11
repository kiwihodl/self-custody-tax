-- Migration: 006_advisor_clients.sql
-- Description: Multi-client dashboard for Advisor tier users
-- Date: 2026-01-11

-- Advisor-Client relationship table
CREATE TABLE IF NOT EXISTS public.advisor_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advisor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  permission_level TEXT DEFAULT 'view' CHECK (permission_level IN ('view', 'manage')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked', 'expired')),
  invitation_token TEXT UNIQUE,
  invitation_expires_at TIMESTAMPTZ,
  invitation_note TEXT,
  advisor_notes TEXT,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT CHECK (revoked_by IN ('advisor', 'client')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_advisor_client_email UNIQUE(advisor_id, client_email)
);

-- Advisor audit log for tracking all actions
CREATE TABLE IF NOT EXISTS public.advisor_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advisor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  action_category TEXT NOT NULL CHECK (action_category IN ('view', 'edit', 'report', 'sync', 'access', 'invitation')),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_advisor_clients_advisor_id ON public.advisor_clients(advisor_id);
CREATE INDEX IF NOT EXISTS idx_advisor_clients_client_id ON public.advisor_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_advisor_clients_token ON public.advisor_clients(invitation_token) WHERE invitation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_advisor_clients_status ON public.advisor_clients(status);
CREATE INDEX IF NOT EXISTS idx_advisor_clients_email ON public.advisor_clients(client_email);

CREATE INDEX IF NOT EXISTS idx_audit_log_advisor_date ON public.advisor_audit_log(advisor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_client_date ON public.advisor_audit_log(client_id, created_at DESC) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_category ON public.advisor_audit_log(action_category);

-- Enable Row Level Security
ALTER TABLE public.advisor_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for advisor_clients

-- Advisors can see and manage their own client relationships
CREATE POLICY "Advisors can view their clients"
  ON public.advisor_clients
  FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can create client invitations"
  ON public.advisor_clients
  FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors can update their clients"
  ON public.advisor_clients
  FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can delete their clients"
  ON public.advisor_clients
  FOR DELETE
  USING (auth.uid() = advisor_id);

-- Clients can see their advisor connections
CREATE POLICY "Clients can view their advisor links"
  ON public.advisor_clients
  FOR SELECT
  USING (auth.uid() = client_id);

-- Clients can revoke advisor access
CREATE POLICY "Clients can revoke advisor access"
  ON public.advisor_clients
  FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (status = 'revoked' AND revoked_by = 'client');

-- RLS Policies for advisor_audit_log

-- Advisors can view their own audit log
CREATE POLICY "Advisors view own audit log"
  ON public.advisor_audit_log
  FOR SELECT
  USING (auth.uid() = advisor_id);

-- Allow inserts for audit logging (service role will do this)
CREATE POLICY "Allow audit log inserts"
  ON public.advisor_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Update wallets policy to allow advisor access
DROP POLICY IF EXISTS "Users can view their own wallets" ON public.wallets;
CREATE POLICY "Users and advisors can view wallets"
  ON public.wallets
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.advisor_clients ac
      WHERE ac.advisor_id = auth.uid()
      AND ac.client_id = wallets.user_id
      AND ac.status = 'active'
    )
  );

-- Update transactions policy to allow advisor access
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users and advisors can view transactions"
  ON public.transactions
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.advisor_clients ac
      WHERE ac.advisor_id = auth.uid()
      AND ac.client_id = transactions.user_id
      AND ac.status = 'active'
    )
  );

-- Update tax_lots policy to allow advisor access
DROP POLICY IF EXISTS "Users can view their own tax lots" ON public.tax_lots;
CREATE POLICY "Users and advisors can view tax_lots"
  ON public.tax_lots
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.advisor_clients ac
      WHERE ac.advisor_id = auth.uid()
      AND ac.client_id = tax_lots.user_id
      AND ac.status = 'active'
    )
  );

-- Advisors with 'manage' permission can edit transactions
CREATE POLICY "Advisors with manage permission can edit transactions"
  ON public.transactions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.advisor_clients ac
      WHERE ac.advisor_id = auth.uid()
      AND ac.client_id = transactions.user_id
      AND ac.status = 'active'
      AND ac.permission_level = 'manage'
    )
  );

-- Advisors with 'manage' permission can edit tax_lots
CREATE POLICY "Advisors with manage permission can edit tax_lots"
  ON public.tax_lots
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.advisor_clients ac
      WHERE ac.advisor_id = auth.uid()
      AND ac.client_id = tax_lots.user_id
      AND ac.status = 'active'
      AND ac.permission_level = 'manage'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_advisor_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS advisor_clients_updated_at ON public.advisor_clients;
CREATE TRIGGER advisor_clients_updated_at
  BEFORE UPDATE ON public.advisor_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_advisor_clients_updated_at();

-- Function to expire old invitations (can be called by cron)
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.advisor_clients
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
  AND invitation_expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE public.advisor_clients IS 'Advisor-client relationships for multi-client dashboard';
COMMENT ON TABLE public.advisor_audit_log IS 'Audit log of all advisor actions on client accounts (7-year retention for IRS compliance)';
COMMENT ON COLUMN public.advisor_clients.permission_level IS 'view = read-only, manage = can edit transactions';
COMMENT ON COLUMN public.advisor_clients.invitation_token IS 'Unique token for accepting invitation';
COMMENT ON COLUMN public.advisor_clients.advisor_notes IS 'Private notes only the advisor can see';
