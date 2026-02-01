-- Migration: Create inputs bucket and configure storage security
-- This migration creates the inputs bucket for user video uploads
-- and configures RLS policies for both inputs and outputs buckets

-- Create inputs bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inputs',
  'inputs',
  false, -- Private bucket
  52428800, -- 50MB limit
  ARRAY['video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload own videos to inputs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own videos from inputs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own videos from inputs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own outputs" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to inputs" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to outputs" ON storage.objects;

-- RLS Policy: Users can upload to their own folder in inputs bucket
CREATE POLICY "Users can upload own videos to inputs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inputs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Users can read their own videos from inputs bucket
CREATE POLICY "Users can read own videos from inputs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inputs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Users can delete their own videos from inputs bucket
CREATE POLICY "Users can delete own videos from inputs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'inputs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Update outputs bucket to private (currently public for dev)
-- IMPORTANT: Uncomment this when ready to go to production
-- UPDATE storage.buckets SET public = false WHERE id = 'outputs';

-- RLS Policy: Users can read their own outputs
-- This policy checks if the output belongs to a generation owned by the user
CREATE POLICY "Users can read own outputs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'outputs' AND
  EXISTS (
    SELECT 1 FROM public.generations
    WHERE output_url LIKE '%' || name AND user_id = auth.uid()
  )
);

-- Service role has full access to all storage buckets
CREATE POLICY "Service role full access to inputs"
ON storage.objects
TO service_role
USING (bucket_id = 'inputs');

CREATE POLICY "Service role full access to outputs"
ON storage.objects
TO service_role
USING (bucket_id = 'outputs');

-- Add comments
COMMENT ON POLICY "Users can upload own videos to inputs" ON storage.objects IS 
'Allows users to upload videos to inputs/<user_id>/ folder structure';

COMMENT ON POLICY "Users can read own outputs" ON storage.objects IS 
'Allows users to access generated videos that belong to their generations';

