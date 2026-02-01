-- ============================================================================
-- WEBHOOK FIXED - Proper Authorization header
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_process_generation()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
  service_role_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4ZXJ3cWNtZ213aHVuZ2xia2xuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjg5MjQ2MSwiZXhwIjoyMDUyNDY4NDYxfQ.gMEr2yqvVYhWQCPwKdTHJQxHZPPNlpqQAJqPQfEUyYg';
BEGIN
  -- Call Edge Function with proper auth header
  SELECT net.http_post(
    url := 'https://dxerwqcmgmwhunglbkln.supabase.co/functions/v1/process-generation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('generation_id', NEW.id)
  ) INTO request_id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Webhook failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_generation_queued ON public.generations;

CREATE TRIGGER on_generation_queued
AFTER INSERT ON public.generations
FOR EACH ROW
WHEN (NEW.status = 'queued')
EXECUTE FUNCTION trigger_process_generation();

SELECT 'Webhook updated with proper auth!' as status;

