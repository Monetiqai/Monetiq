-- MUSIC MODE - Phase 2: Database Contracts
-- Creates tables for job queue, outputs, provider logging, and usage tracking

-- Table: music_jobs
-- Tracks all music generation jobs with status and provider routing
CREATE TABLE IF NOT EXISTS public.music_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Job status
  status TEXT NOT NULL DEFAULT 'queued' 
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  
  -- Audio type
  audio_type TEXT NOT NULL 
    CHECK (audio_type IN ('instrumental', 'voice_standard', 'voice_premium')),
  
  -- Input parameters
  preset TEXT,
  duration_sec INTEGER NOT NULL,
  prompt TEXT,
  text TEXT,
  voice_id TEXT,
  
  -- Provider routing
  provider_target TEXT, -- Intended provider (e.g., 'elevenlabs', 'polly', 'stable_audio')
  provider_final TEXT,  -- Actual provider used (after fallback)
  fallback_used BOOLEAN DEFAULT false,
  
  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for music_jobs
CREATE INDEX IF NOT EXISTS idx_music_jobs_user_status 
  ON public.music_jobs(user_id, status);

CREATE INDEX IF NOT EXISTS idx_music_jobs_status_queued 
  ON public.music_jobs(status, created_at) 
  WHERE status IN ('queued', 'running');

CREATE INDEX IF NOT EXISTS idx_music_jobs_created 
  ON public.music_jobs(created_at DESC);

-- Table: music_outputs
-- Links jobs to generated assets (can have multiple outputs per job)
CREATE TABLE IF NOT EXISTS public.music_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.music_jobs(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  
  kind TEXT NOT NULL CHECK (kind IN ('music', 'voice', 'mix')),
  duration_sec INTEGER,
  meta JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for music_outputs
CREATE INDEX IF NOT EXISTS idx_music_outputs_job 
  ON public.music_outputs(job_id);

CREATE INDEX IF NOT EXISTS idx_music_outputs_asset 
  ON public.music_outputs(asset_id);

-- Table: provider_calls
-- Logs all provider API calls for debugging and monitoring
CREATE TABLE IF NOT EXISTS public.provider_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.music_jobs(id) ON DELETE CASCADE,
  
  provider TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'succeeded', 'failed')),
  
  latency_ms INTEGER,
  request_meta JSONB DEFAULT '{}',
  response_meta JSONB DEFAULT '{}',
  
  error_code TEXT,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for provider_calls
CREATE INDEX IF NOT EXISTS idx_provider_calls_job 
  ON public.provider_calls(job_id);

CREATE INDEX IF NOT EXISTS idx_provider_calls_provider_status 
  ON public.provider_calls(provider, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_calls_created 
  ON public.provider_calls(created_at DESC);

-- Table: usage_credits
-- Tracks user quotas and credit usage
CREATE TABLE IF NOT EXISTS public.usage_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Credit balances (in seconds of audio)
  seconds_standard INTEGER DEFAULT 300, -- 5 minutes free
  seconds_premium INTEGER DEFAULT 60,   -- 1 minute free
  
  -- Ledger for audit trail
  ledger JSONB DEFAULT '[]', -- [{action, amount, job_id, timestamp, reason}]
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint: one row per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_credits_user 
  ON public.usage_credits(user_id);

-- Enable RLS on all tables
ALTER TABLE public.music_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_credits ENABLE ROW LEVEL SECURITY;

-- RLS Policies: music_jobs
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.music_jobs;
CREATE POLICY "Users can view their own jobs"
  ON public.music_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own jobs" ON public.music_jobs;
CREATE POLICY "Users can insert their own jobs"
  ON public.music_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to jobs" ON public.music_jobs;
CREATE POLICY "Service role full access to jobs"
  ON public.music_jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies: music_outputs
DROP POLICY IF EXISTS "Users can view outputs for their jobs" ON public.music_outputs;
CREATE POLICY "Users can view outputs for their jobs"
  ON public.music_outputs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.music_jobs
      WHERE music_jobs.id = music_outputs.job_id
      AND music_jobs.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to outputs" ON public.music_outputs;
CREATE POLICY "Service role full access to outputs"
  ON public.music_outputs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies: provider_calls
DROP POLICY IF EXISTS "Users can view calls for their jobs" ON public.provider_calls;
CREATE POLICY "Users can view calls for their jobs"
  ON public.provider_calls FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.music_jobs
      WHERE music_jobs.id = provider_calls.job_id
      AND music_jobs.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to calls" ON public.provider_calls;
CREATE POLICY "Service role full access to calls"
  ON public.provider_calls FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies: usage_credits
DROP POLICY IF EXISTS "Users can view their own credits" ON public.usage_credits;
CREATE POLICY "Users can view their own credits"
  ON public.usage_credits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to credits" ON public.usage_credits;
CREATE POLICY "Service role full access to credits"
  ON public.usage_credits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_music_jobs_updated_at
  BEFORE UPDATE ON public.music_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_credits_updated_at
  BEFORE UPDATE ON public.usage_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize credits for new users
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usage_credits (user_id, seconds_standard, seconds_premium)
  VALUES (NEW.id, 300, 60)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create credits on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_init_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_init_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_credits();

-- Comments for documentation
COMMENT ON TABLE public.music_jobs IS 'Music generation job queue with status tracking';
COMMENT ON TABLE public.music_outputs IS 'Links jobs to generated audio assets';
COMMENT ON TABLE public.provider_calls IS 'Logs all provider API calls for monitoring';
COMMENT ON TABLE public.usage_credits IS 'User quota tracking in seconds of audio';
