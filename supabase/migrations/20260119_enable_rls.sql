-- Migration: Enable RLS and create security policies for generations table
-- This migration secures the generations table so users can only see their own jobs

-- Enable Row Level Security
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own rows
CREATE POLICY "Users can insert own generations"
ON public.generations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can select their own rows
CREATE POLICY "Users can select own generations"
ON public.generations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update their own rows (for future features like cancel/delete)
CREATE POLICY "Users can update own generations"
ON public.generations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Service role has full access (for Edge Function worker)
CREATE POLICY "Service role full access"
ON public.generations
TO service_role
USING (true)
WITH CHECK (true);

-- Add comments for documentation
COMMENT ON POLICY "Users can insert own generations" ON public.generations IS 
'Allows authenticated users to create new generation jobs associated with their user_id';

COMMENT ON POLICY "Users can select own generations" ON public.generations IS 
'Allows users to view only their own generation jobs, ensuring data privacy';

COMMENT ON POLICY "Service role full access" ON public.generations IS 
'Allows Edge Functions with service role to process any job regardless of user_id';
