-- ============================================================================
-- CANONICAL PRODUCT IMAGE PATH — DATABASE MIGRATION
-- Created: 2026-01-25
-- Purpose: Enforce canonical product image path system rule
-- Path Format: monetiq/inputs/{product_id}/source.png
-- ============================================================================

-- ============================================================================
-- 1. ADD CANONICAL PRODUCT IMAGE URL COLUMN
-- ============================================================================

-- Add canonical_product_image_url field to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS canonical_product_image_url TEXT;

-- Add comment explaining the canonical path rule
COMMENT ON COLUMN public.projects.canonical_product_image_url IS 
'Canonical R2 URL for product image. Format: monetiq/inputs/{product_id}/source.png. Always PNG. One product = one canonical image.';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_canonical_product_image 
ON public.projects(canonical_product_image_url);

-- ============================================================================
-- 2. DEPRECATE LEGACY FIELDS
-- ============================================================================

-- Mark legacy fields as deprecated
COMMENT ON COLUMN public.projects.product_image_path IS 
'DEPRECATED: Use canonical_product_image_url instead. Legacy Supabase Storage path.';

COMMENT ON COLUMN public.projects.product_image_url IS 
'DEPRECATED: Use canonical_product_image_url instead. Legacy R2 URL (non-canonical path).';

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

-- Verify column was added
SELECT 
    'canonical_product_image_url column check' as check,
    EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'canonical_product_image_url'
    )::text as result;

-- Verify index was created
SELECT 
    'canonical_product_image_url index check' as check,
    EXISTS(
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'projects' 
        AND indexname = 'idx_projects_canonical_product_image'
    )::text as result;

-- ============================================================================
-- DONE! Canonical product image path system rule enabled
-- ============================================================================
