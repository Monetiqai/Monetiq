-- ============================================================================
-- WEBHOOK CONFIGURATION - RUN THIS AS ADMIN
-- This enables automatic Edge Function triggering
-- ============================================================================

-- Step 1: Create the webhook trigger function
CREATE OR REPLACE FUNCTION trigger_process_generation()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the Edge Function via pg_net
  PERFORM net.http_post(
    url := 'https://dxerwqcmgmwhunglbkln.supabase.co/functions/v1/process-generation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'sub'
    ),
    body := jsonb_build_object('generation_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert
  RAISE WARNING 'Failed to trigger Edge Function: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create the trigger
DROP TRIGGER IF EXISTS on_generation_queued ON public.generations;

CREATE TRIGGER on_generation_queued
AFTER INSERT ON public.generations
FOR EACH ROW
WHEN (NEW.status = 'queued')
EXECUTE FUNCTION trigger_process_generation();

-- Step 3: Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO postgres;

-- Verification
SELECT 'Webhook configured successfully' as status;
