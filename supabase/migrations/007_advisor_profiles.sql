-- Migration: Phase 10 - White-Label Reports
-- Advisor profile branding and customization

-- Advisor branding profile
CREATE TABLE IF NOT EXISTS public.advisor_profiles (
  id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  firm_name TEXT,
  logo_path TEXT,  -- Path in Supabase Storage
  primary_color TEXT DEFAULT '#F7931A',  -- Bitcoin orange default
  secondary_color TEXT DEFAULT '#1a1a2e',
  accent_color TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'USA',
  footer_text TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_advisor_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_advisor_profiles_timestamp
  BEFORE UPDATE ON public.advisor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_advisor_profile_timestamp();

-- Enable RLS
ALTER TABLE public.advisor_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own profile
CREATE POLICY "Users can view their own advisor profile"
  ON public.advisor_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can create their own advisor profile"
  ON public.advisor_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own advisor profile"
  ON public.advisor_profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can delete their own advisor profile"
  ON public.advisor_profiles
  FOR DELETE
  USING (auth.uid() = id);

-- Allow advisors to read branding for their linked clients' reports
-- (Clients see advisor branding on reports)
CREATE POLICY "Linked clients can view advisor branding"
  ON public.advisor_profiles
  FOR SELECT
  USING (
    id IN (
      SELECT advisor_id FROM public.advisor_clients
      WHERE client_id = auth.uid()
      AND status = 'active'
    )
  );

-- Create storage bucket for advisor assets (logos)
-- Note: Run this in Supabase Dashboard or via supabase CLI
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('advisor-assets', 'advisor-assets', true);

COMMENT ON TABLE public.advisor_profiles IS 'Stores branding and contact information for advisor tier users to white-label reports';
COMMENT ON COLUMN public.advisor_profiles.logo_path IS 'Path to logo in advisor-assets storage bucket';
COMMENT ON COLUMN public.advisor_profiles.primary_color IS 'Hex color for headers and accents (e.g., #F7931A)';
COMMENT ON COLUMN public.advisor_profiles.secondary_color IS 'Hex color for backgrounds and borders';
COMMENT ON COLUMN public.advisor_profiles.footer_text IS 'Custom disclaimer or footer text for reports';
