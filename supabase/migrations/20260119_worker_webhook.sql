-- Migration: Add webhook to trigger Edge Function on new queued jobs
-- This webhook will automatically invoke the process-generation Edge Function
-- whenever a new generation is inserted with status='queued'

-- Create function to trigger Edge Function via HTTP POST
CREATE OR REPLACE FUNCTION trigger_process_generation()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get the Edge Function URL (update this after deploying the function)
  function_url := current_setting('app.settings.edge_function_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings not configured, use default Supabase project URL
  IF function_url IS NULL THEN
    function_url := 'https://dxerwqcmgmwhunglbkln.supabase.co/functions/v1/process-generation';
  END IF;

  -- Trigger Edge Function asynchronously using pg_net extension
  -- Note: This requires pg_net extension to be enabled
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('generation_id', NEW.id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on INSERT to generations table
DROP TRIGGER IF EXISTS on_generation_queued ON public.generations;

CREATE TRIGGER on_generation_queued
AFTER INSERT ON public.generations
FOR EACH ROW
WHEN (NEW.status = 'queued')
EXECUTE FUNCTION trigger_process_generation();

-- Add comment for documentation
COMMENT ON FUNCTION trigger_process_generation() IS 
'Automatically triggers the process-generation Edge Function when a new generation is queued';

COMMENT ON TRIGGER on_generation_queued ON public.generations IS 
'Invokes process-generation Edge Function for automatic video generation processing';
