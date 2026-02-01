-- MUSIC MODE - Phase 0: Add audio support to assets table
-- This migration updates the kind constraint to include 'audio'

-- Drop existing constraint
ALTER TABLE public.assets 
DROP CONSTRAINT IF EXISTS assets_kind_check;

-- Add new constraint with audio support
ALTER TABLE public.assets 
ADD CONSTRAINT assets_kind_check 
CHECK (kind IN ('image', 'video', 'audio'));

-- Add audio-specific index for better query performance
CREATE INDEX IF NOT EXISTS idx_assets_audio 
ON public.assets(kind, user_id, created_at DESC) 
WHERE kind = 'audio';

-- Add index for audio role queries
CREATE INDEX IF NOT EXISTS idx_assets_audio_role 
ON public.assets(kind, role, status) 
WHERE kind = 'audio';

-- Verify constraint works
COMMENT ON CONSTRAINT assets_kind_check ON public.assets IS 
'Allows image, video, and audio asset types for Music Mode support';
