-- PHASE 11.5 HOTFIX — MAKE LEGACY STORAGE FIELDS NULLABLE
-- Created: 2026-01-25
-- Purpose: Allow NULL for storage_bucket and storage_path when using R2

-- ============================================================================
-- ASSETS TABLE
-- ============================================================================

-- Make legacy Supabase Storage fields nullable for R2 migration
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assets') THEN
        -- Drop NOT NULL constraints on legacy fields
        ALTER TABLE public.assets ALTER COLUMN storage_bucket DROP NOT NULL;
        ALTER TABLE public.assets ALTER COLUMN storage_path DROP NOT NULL;
        
        RAISE NOTICE 'Assets table: storage_bucket and storage_path are now nullable';
    ELSE
        RAISE NOTICE 'Assets table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.assets.storage_bucket IS 'Legacy Supabase Storage bucket (nullable for R2 assets)';
COMMENT ON COLUMN public.assets.storage_path IS 'Legacy Supabase Storage path (nullable for R2 assets)';
COMMENT ON COLUMN public.assets.origin_provider IS 'Storage provider: supabase or r2';
COMMENT ON COLUMN public.assets.r2_bucket IS 'R2 bucket name (populated when origin_provider=r2)';
COMMENT ON COLUMN public.assets.r2_key IS 'R2 object key (populated when origin_provider=r2)';
COMMENT ON COLUMN public.assets.public_url IS 'Canonical public URL (prefer this in UI)';
