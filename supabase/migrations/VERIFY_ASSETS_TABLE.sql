-- Quick verification script
-- Run this in Supabase SQL Editor to check current state

-- 1. Check if assets table exists
SELECT 
  'assets table exists' as check,
  EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'assets'
  )::text as result;

-- 2. If table exists, show its columns
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'assets'
ORDER BY ordinal_position;

-- 3. Check RLS status
SELECT 
  'RLS enabled' as check,
  relrowsecurity::text as result
FROM pg_class 
WHERE relname = 'assets';

-- 4. Check policies
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'assets';
