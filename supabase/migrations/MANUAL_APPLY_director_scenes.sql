-- ============================================================================
-- MANUAL MIGRATION: Director Mode Multi-Scene Infrastructure
-- Execute this script in Supabase Dashboard → SQL Editor
-- This is future-phase infrastructure (app uses state-only for now)
-- ============================================================================

-- 1. Add template_id to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS template_id TEXT DEFAULT NULL;

COMMENT ON COLUMN public.projects.template_id IS 'Optional template ID for multi-scene projects (e.g., ad_15s, trailer_30s)';

-- 2. Add scene_id to assets table
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS scene_id UUID DEFAULT NULL;

COMMENT ON COLUMN public.assets.scene_id IS 'Optional scene ID for multi-scene workflows. NULL for single-scene projects.';

-- 3. Create scenes table
CREATE TABLE IF NOT EXISTS public.scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scene_index INT NOT NULL,
  intent TEXT NOT NULL,
  recommended_duration INT DEFAULT 5,
  recommended_movement TEXT DEFAULT 'static',
  anchor_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.scenes IS 'Lightweight scene orchestration for multi-scene Director Mode projects';

-- 4. Enable RLS on scenes
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own scenes" ON public.scenes;
DROP POLICY IF EXISTS "Service role full access to scenes" ON public.scenes;

-- Create policies
CREATE POLICY "Users can manage own scenes"
ON public.scenes
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to scenes"
ON public.scenes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON public.scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_user_id ON public.scenes(user_id);
CREATE INDEX IF NOT EXISTS idx_scenes_scene_index ON public.scenes(project_id, scene_index);
CREATE INDEX IF NOT EXISTS idx_assets_scene_id ON public.assets(scene_id) WHERE scene_id IS NOT NULL;

-- 6. Add foreign key constraint (idempotent)
ALTER TABLE public.assets
DROP CONSTRAINT IF EXISTS fk_assets_scene_id;

ALTER TABLE public.assets
ADD CONSTRAINT fk_assets_scene_id 
FOREIGN KEY (scene_id) 
REFERENCES public.scenes(id) 
ON DELETE SET NULL;

-- 7. Create updated_at trigger
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
-- VERIFICATION QUERIES
-- Run these to verify the migration was successful
-- ============================================================================

-- Check if all objects were created
SELECT 
  'template_id column' as object,
  EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'template_id'
  ) as created
UNION ALL
SELECT 
  'scene_id column',
  EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'assets' 
    AND column_name = 'scene_id'
  )
UNION ALL
SELECT 
  'scenes table',
  EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'scenes'
  )
UNION ALL
SELECT 
  'RLS on scenes',
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'scenes')
UNION ALL
SELECT 
  'FK constraint',
  EXISTS(
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_assets_scene_id'
    AND table_name = 'assets'
  );

-- ============================================================================
-- SUCCESS! Multi-scene infrastructure is ready
-- Note: The app will continue using state-only scenes until explicitly wired
-- ============================================================================
