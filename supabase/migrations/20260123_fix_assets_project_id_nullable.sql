-- Fix assets table to make project_id nullable
-- This allows uploading assets before creating an ad_pack/project

ALTER TABLE public.assets 
ALTER COLUMN project_id DROP NOT NULL;

-- Verify the change
SELECT 
  column_name, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'assets' 
  AND column_name = 'project_id';
