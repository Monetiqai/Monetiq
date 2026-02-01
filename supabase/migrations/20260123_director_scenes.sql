-- ============================================================================
-- DIRECTOR MODE MULTI-SCENE EXTENSION
-- Adds optional scenes table and extends existing tables for multi-scene support
-- 100% backward compatible - all new columns are nullable
-- ============================================================================

-- ============================================================================
-- 1. EXTEND PROJECTS TABLE
-- ============================================================================

-- Add template_id to projects (nullable for backward compatibility)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS template_id TEXT DEFAULT NULL;

COMMENT ON COLUMN public.projects.template_id IS 'Optional template ID for multi-scene projects (e.g., ad_15s, trailer_30s)';

-- ============================================================================
-- 2. EXTEND ASSETS TABLE
-- ============================================================================

-- Add scene_id to assets (nullable for backward compatibility)
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS scene_id UUID DEFAULT NULL;

COMMENT ON COLUMN public.assets.scene_id IS 'Optional scene ID for multi-scene workflows. NULL for single-scene projects.';

-- ============================================================================
-- 3. CREATE SCENES TABLE
-- ============================================================================

-- Create scenes table (optional, for multi-scene projects)
CREATE TABLE IF NOT EXISTS public.scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scene_index INT NOT NULL, -- 0-based order
  intent TEXT NOT NULL,
  recommended_duration INT DEFAULT 5,
  recommended_movement TEXT DEFAULT 'static',
  anchor_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.scenes IS 'Lightweight scene orchestration for multi-scene Director Mode projects';

-- ============================================================================
-- 4. ENABLE RLS ON SCENES TABLE
-- ============================================================================

ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own scenes" ON public.scenes;
DROP POLICY IF EXISTS "Service role full access to scenes" ON public.scenes;

-- Policy: Users can manage their own scenes
CREATE POLICY "Users can manage own scenes"
ON public.scenes
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Service role has full access (for Edge Functions)
CREATE POLICY "Service role full access to scenes"
ON public.scenes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON public.scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_user_id ON public.scenes(user_id);
CREATE INDEX IF NOT EXISTS idx_scenes_scene_index ON public.scenes(project_id, scene_index);
CREATE INDEX IF NOT EXISTS idx_assets_scene_id ON public.assets(scene_id) WHERE scene_id IS NOT NULL;

-- ============================================================================
-- 6. ADD FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Add FK constraint from assets.scene_id to scenes.id
-- ON DELETE SET NULL ensures assets remain valid if a scene is deleted
-- Drop existing constraint first to make this idempotent
ALTER TABLE public.assets
DROP CONSTRAINT IF EXISTS fk_assets_scene_id;

ALTER TABLE public.assets
ADD CONSTRAINT fk_assets_scene_id 
FOREIGN KEY (scene_id) 
REFERENCES public.scenes(id) 
ON DELETE SET NULL;

-- ============================================================================
-- 7. ADD UPDATED_AT TRIGGER FOR SCENES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_scenes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scenes_updated_at ON public.scenes;
CREATE TRIGGER scenes_updated_at
BEFORE UPDATE ON public.scenes
FOR EACH ROW
EXECUTE FUNCTION update_scenes_updated_at();

-- ============================================================================
-- 8. VERIFICATION
-- ============================================================================

SELECT 'template_id column added to projects' as check,
       EXISTS(
         SELECT 1 FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'projects' 
         AND column_name = 'template_id'
       )::text as result
UNION ALL
SELECT 'scene_id column added to assets',
       EXISTS(
         SELECT 1 FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'assets' 
         AND column_name = 'scene_id'
       )::text
UNION ALL
SELECT 'scenes table created',
       EXISTS(
         SELECT 1 FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name = 'scenes'
       )::text
UNION ALL
SELECT 'RLS enabled on scenes',
       (SELECT relrowsecurity FROM pg_class WHERE relname = 'scenes')::text
UNION ALL
SELECT 'FK constraint assets.scene_id -> scenes.id created',
       EXISTS(
         SELECT 1 FROM information_schema.table_constraints 
         WHERE constraint_name = 'fk_assets_scene_id'
         AND table_name = 'assets'
       )::text;

-- ============================================================================
-- DONE! Multi-scene infrastructure ready
-- ============================================================================
