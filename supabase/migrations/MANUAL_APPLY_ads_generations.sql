-- PHASE 11 — APPLY ADS_GENERATIONS TABLE MANUALLY
-- Run this in Supabase SQL Editor if supabase db push fails

-- Drop table if exists (for clean re-run)
DROP TABLE IF EXISTS public.ads_generations CASCADE;
DROP FUNCTION IF EXISTS check_roles_unique(JSONB) CASCADE;
DROP FUNCTION IF EXISTS check_valid_roles(JSONB) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Now run the full migration from 20260124_create_ads_generations.sql

