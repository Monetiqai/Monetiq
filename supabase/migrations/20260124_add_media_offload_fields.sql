-- PHASE 11.5 — MEDIA OFFLOAD: ADD R2 FIELDS
-- Created: 2026-01-24
-- Purpose: Add fields for Cloudflare R2 migration (strangler pattern)

-- ============================================================================
-- ASSETS TABLE (if exists - for Director Mode)
-- ============================================================================

-- Add media offload fields to assets table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assets') THEN
        -- Origin provider
        ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS origin_provider TEXT DEFAULT 'supabase';
        
        -- Supabase fields
        ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS supabase_bucket TEXT;
        ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS supabase_path TEXT;
        
        -- R2 fields
        ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS r2_bucket TEXT;
        ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS r2_key TEXT;
        
        -- Canonical URL (prefer this in UI)
        ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS public_url TEXT;
        
        -- Media metadata
        ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS mime_type TEXT;
        ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS byte_size BIGINT;
        ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS width INTEGER;
        ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS height INTEGER;
        ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS duration FLOAT;
        ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS checksum_sha256 TEXT;
        ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
        
        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_assets_origin_provider ON public.assets(origin_provider);
        CREATE INDEX IF NOT EXISTS idx_assets_public_url ON public.assets(public_url);
        CREATE INDEX IF NOT EXISTS idx_assets_r2_key ON public.assets(r2_key);
        
        -- Backfill existing assets (set provider to supabase for existing records)
        UPDATE public.assets 
        SET origin_provider = 'supabase'
        WHERE origin_provider IS NULL;
        
        RAISE NOTICE 'Assets table updated with media offload fields';
    ELSE
        RAISE NOTICE 'Assets table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- ADS_GENERATIONS TABLE (Ads Mode)
-- ============================================================================

-- Add provider and R2 key fields for each shot
ALTER TABLE public.ads_generations ADD COLUMN IF NOT EXISTS shot_1_provider TEXT DEFAULT 'supabase';
ALTER TABLE public.ads_generations ADD COLUMN IF NOT EXISTS shot_1_r2_key TEXT;

ALTER TABLE public.ads_generations ADD COLUMN IF NOT EXISTS shot_2_provider TEXT DEFAULT 'supabase';
ALTER TABLE public.ads_generations ADD COLUMN IF NOT EXISTS shot_2_r2_key TEXT;

ALTER TABLE public.ads_generations ADD COLUMN IF NOT EXISTS shot_3_provider TEXT DEFAULT 'supabase';
ALTER TABLE public.ads_generations ADD COLUMN IF NOT EXISTS shot_3_r2_key TEXT;

ALTER TABLE public.ads_generations ADD COLUMN IF NOT EXISTS shot_4_provider TEXT DEFAULT 'supabase';
ALTER TABLE public.ads_generations ADD COLUMN IF NOT EXISTS shot_4_r2_key TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ads_gen_shot_1_provider ON public.ads_generations(shot_1_provider);
CREATE INDEX IF NOT EXISTS idx_ads_gen_shot_2_provider ON public.ads_generations(shot_2_provider);
CREATE INDEX IF NOT EXISTS idx_ads_gen_shot_3_provider ON public.ads_generations(shot_3_provider);
CREATE INDEX IF NOT EXISTS idx_ads_gen_shot_4_provider ON public.ads_generations(shot_4_provider);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.ads_generations.shot_1_provider IS 'Storage provider for shot 1: supabase or r2';
COMMENT ON COLUMN public.ads_generations.shot_1_r2_key IS 'R2 object key for shot 1 (if provider=r2)';
COMMENT ON COLUMN public.ads_generations.shot_2_provider IS 'Storage provider for shot 2: supabase or r2';
COMMENT ON COLUMN public.ads_generations.shot_2_r2_key IS 'R2 object key for shot 2 (if provider=r2)';
COMMENT ON COLUMN public.ads_generations.shot_3_provider IS 'Storage provider for shot 3: supabase or r2';
COMMENT ON COLUMN public.ads_generations.shot_3_r2_key IS 'R2 object key for shot 3 (if provider=r2)';
COMMENT ON COLUMN public.ads_generations.shot_4_provider IS 'Storage provider for shot 4: supabase or r2';
COMMENT ON COLUMN public.ads_generations.shot_4_r2_key IS 'R2 object key for shot 4 (if provider=r2)';
