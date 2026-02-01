-- PHASE 2.5 - Atomic Quota Reservation Function
-- Creates RPC function for atomic quota check + job creation

CREATE OR REPLACE FUNCTION public.reserve_quota_and_create_job(
  p_user_id UUID,
  p_audio_type TEXT,
  p_duration_sec INTEGER,
  p_preset TEXT,
  p_text TEXT,
  p_quota_field TEXT
)
RETURNS JSON AS $$
DECLARE
  v_current_quota INTEGER;
  v_job_id UUID;
  v_provider_target TEXT;
BEGIN
  -- Lock the user's credits row for update
  SELECT 
    CASE 
      WHEN p_quota_field = 'seconds_premium' THEN seconds_premium
      ELSE seconds_standard
    END INTO v_current_quota
  FROM public.usage_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if enough quota
  IF v_current_quota IS NULL THEN
    RAISE EXCEPTION 'User credits not found';
  END IF;

  IF v_current_quota < p_duration_sec THEN
    RAISE EXCEPTION 'Insufficient quota: % seconds available, % needed', v_current_quota, p_duration_sec;
  END IF;

  -- Determine target provider
  v_provider_target := CASE p_audio_type
    WHEN 'instrumental' THEN 'stable_audio'
    WHEN 'voice_premium' THEN 'elevenlabs'
    WHEN 'voice_standard' THEN 'polly'
  END;

  -- Create job
  INSERT INTO public.music_jobs (
    user_id,
    status,
    audio_type,
    duration_sec,
    preset,
    text,
    provider_target
  ) VALUES (
    p_user_id,
    'queued',
    p_audio_type,
    p_duration_sec,
    p_preset,
    p_text,
    v_provider_target
  ) RETURNING id INTO v_job_id;

  -- Decrement quota
  IF p_quota_field = 'seconds_premium' THEN
    UPDATE public.usage_credits
    SET 
      seconds_premium = seconds_premium - p_duration_sec,
      ledger = ledger || jsonb_build_object(
        'action', 'reserve',
        'amount', -p_duration_sec,
        'field', 'seconds_premium',
        'job_id', v_job_id,
        'timestamp', NOW(),
        'reason', 'job_creation'
      )
    WHERE user_id = p_user_id;
  ELSE
    UPDATE public.usage_credits
    SET 
      seconds_standard = seconds_standard - p_duration_sec,
      ledger = ledger || jsonb_build_object(
        'action', 'reserve',
        'amount', -p_duration_sec,
        'field', 'seconds_standard',
        'job_id', v_job_id,
        'timestamp', NOW(),
        'reason', 'job_creation'
      )
    WHERE user_id = p_user_id;
  END IF;

  -- Return job ID
  RETURN json_build_object('job_id', v_job_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.reserve_quota_and_create_job TO authenticated;
