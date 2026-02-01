-- ============================================================================
-- ADD META COLUMN TO PROJECTS TABLE
-- Adds meta JSONB column for storing project metadata
-- 100% backward compatible - column is nullable
-- ============================================================================

-- ============================================================================
-- 1. ADD META COLUMN TO PROJECTS TABLE
-- ============================================================================

-- Add meta column to projects (nullable for backward compatibility)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT NULL;

COMMENT ON COLUMN public.projects.meta IS 'Optional metadata for projects (e.g., session info, scene intents, director settings)';

-- ============================================================================
-- 2. VERIFICATION
-- ============================================================================

SELECT 'meta column added to projects' as check,
       EXISTS(
         SELECT 1 FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'projects' 
         AND column_name = 'meta'
       )::text as result;

-- ============================================================================
-- DONE! Projects table now supports metadata storage
-- ============================================================================
