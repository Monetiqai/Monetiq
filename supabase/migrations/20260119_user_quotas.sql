-- Migration: Create user quotas system for rate limiting and anti-abuse
-- This migration creates the user_quotas table and related functions

-- Create user_quotas table
CREATE TABLE IF NOT EXISTS public.user_quotas (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  generations_used_today INT NOT NULL DEFAULT 0,
  generations_limit_daily INT NOT NULL DEFAULT 5, -- free: 5, pro: 50, enterprise: unlimited (-1)
  max_queued_jobs INT NOT NULL DEFAULT 3, -- Maximum concurrent queued/processing jobs
  last_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on user_quotas
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own quotas
CREATE POLICY "Users can read own quotas"
ON public.user_quotas FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Service role can manage all quotas
CREATE POLICY "Service role full access to quotas"
ON public.user_quotas
TO service_role
USING (true)
WITH CHECK (true);

-- Function: Auto-create quota row when user signs up
CREATE OR REPLACE FUNCTION create_user_quota()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_quotas (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create quota on user signup
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
CREATE TRIGGER on_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_user_quota();

-- Function: Reset daily quotas (to be called by cron)
CREATE OR REPLACE FUNCTION reset_daily_quotas()
RETURNS void AS $$
BEGIN
  UPDATE public.user_quotas
  SET 
    generations_used_today = 0,
    last_reset_at = NOW(),
    updated_at = NOW()
  WHERE last_reset_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment user quota (called by API)
CREATE OR REPLACE FUNCTION increment_user_quota(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_quotas (user_id, generations_used_today)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    generations_used_today = user_quotas.generations_used_today + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for faster quota lookups
CREATE INDEX IF NOT EXISTS idx_user_quotas_user_id ON public.user_quotas(user_id);

-- Add comments
COMMENT ON TABLE public.user_quotas IS 
'Stores user quota limits and usage for rate limiting and anti-abuse';

COMMENT ON FUNCTION reset_daily_quotas() IS 
'Resets daily generation quotas for all users. Should be called daily via cron.';

COMMENT ON FUNCTION increment_user_quota(UUID) IS 
'Increments the generations_used_today counter for a specific user';
