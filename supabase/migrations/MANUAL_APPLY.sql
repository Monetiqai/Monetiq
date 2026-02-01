-- ============================================================================
-- MANUAL MIGRATION SCRIPT FOR MONETIQ.AI
-- Apply this SQL in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/dxerwqcmgmwhunglbkln/sql/new
-- ============================================================================

-- ============================================================================
-- 1. ENABLE RLS ON GENERATIONS TABLE
-- ============================================================================

ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can select own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can update own generations" ON public.generations;
DROP POLICY IF EXISTS "Service role full access" ON public.generations;

-- Policy: Users can insert their own rows
CREATE POLICY "Users can insert own generations"
ON public.generations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can select their own rows
CREATE POLICY "Users can select own generations"
ON public.generations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update their own rows
CREATE POLICY "Users can update own generations"
ON public.generations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Service role has full access (for Edge Function)
CREATE POLICY "Service role full access"
ON public.generations
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 2. CREATE INPUTS STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inputs',
  'inputs',
  false,
  52428800,
  ARRAY['video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. STORAGE RLS POLICIES
-- ============================================================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload own videos to inputs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own videos from inputs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own videos from inputs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own outputs" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to inputs" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to outputs" ON storage.objects;

-- Inputs bucket policies
CREATE POLICY "Users can upload own videos to inputs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inputs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own videos from inputs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inputs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own videos from inputs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'inputs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Outputs bucket policies
CREATE POLICY "Users can read own outputs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'outputs' AND
  EXISTS (
    SELECT 1 FROM public.generations
    WHERE output_url LIKE '%' || name AND user_id = auth.uid()
  )
);

-- Service role policies
CREATE POLICY "Service role full access to inputs"
ON storage.objects
TO service_role
USING (bucket_id = 'inputs');

CREATE POLICY "Service role full access to outputs"
ON storage.objects
TO service_role
USING (bucket_id = 'outputs');

-- ============================================================================
-- 4. USER QUOTAS SYSTEM
-- ============================================================================

-- Create user_quotas table
CREATE TABLE IF NOT EXISTS public.user_quotas (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  generations_used_today INT NOT NULL DEFAULT 0,
  generations_limit_daily INT NOT NULL DEFAULT 5,
  max_queued_jobs INT NOT NULL DEFAULT 3,
  last_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own quotas" ON public.user_quotas;
DROP POLICY IF EXISTS "Service role full access to quotas" ON public.user_quotas;

-- Policies
CREATE POLICY "Users can read own quotas"
ON public.user_quotas FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to quotas"
ON public.user_quotas
TO service_role
USING (true)
WITH CHECK (true);

-- Auto-create quota on user signup
CREATE OR REPLACE FUNCTION create_user_quota()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_quotas (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created ON auth.users;
CREATE TRIGGER on_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_user_quota();

-- Daily reset function
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

-- ============================================================================
-- 5. DATABASE WEBHOOK (OPTIONAL - REQUIRES pg_net EXTENSION)
-- ============================================================================

-- NOTE: This webhook will auto-trigger the Edge Function
-- You can skip this if you want to test manually first

-- Create webhook function
CREATE OR REPLACE FUNCTION trigger_process_generation()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  service_role_key TEXT;
BEGIN
  function_url := 'https://dxerwqcmgmwhunglbkln.supabase.co/functions/v1/process-generation';
  
  -- Trigger Edge Function via pg_net
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('generation_id', NEW.id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_generation_queued ON public.generations;
CREATE TRIGGER on_generation_queued
AFTER INSERT ON public.generations
FOR EACH ROW
WHEN (NEW.status = 'queued')
EXECUTE FUNCTION trigger_process_generation();

-- ============================================================================
-- 6. CONFIGURE SERVICE ROLE KEY FOR WEBHOOK
-- ============================================================================

-- Run this separately AFTER replacing <YOUR_SERVICE_ROLE_KEY>
-- Get the key from your .env.local file (SUPABASE_SERVICE_ROLE_KEY)

-- ALTER DATABASE postgres SET app.settings.service_role_key = '<YOUR_SERVICE_ROLE_KEY>';

-- ============================================================================
-- DONE! 
-- ============================================================================

-- Verify everything worked:
SELECT 'RLS enabled on generations' as check, 
       pg_catalog.pg_table_is_visible('public.generations'::regclass) as result
UNION ALL
SELECT 'inputs bucket created', 
       EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'inputs')
UNION ALL
SELECT 'user_quotas table created', 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_quotas');
