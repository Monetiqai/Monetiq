-- Migration: Add input_url column for video-to-video generation
-- This allows users to upload an input video that Veo will use as reference

ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS input_url TEXT;

COMMENT ON COLUMN public.generations.input_url IS 
'URL of the input video for video-to-video generation. Optional field - if null, uses text-to-video mode.';

-- Verification
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'generations'
  AND column_name = 'input_url';
