-- PHASE 12 — SYSTEM HEALTH (MONETIQ-SAFE)
-- Scope: current authenticated user only (auth.uid)
-- Backend-only aggregates. UI must not compute anything.

CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Hard block if called without an authenticated user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT json_build_object(
    'total_runs', COUNT(*),

    -- Hook status lives in metadata (per your schema)
    -- Safe: if missing, metadata->>'hook_status' is NULL and won't match 'FAIL'
    'hook_fail_count', COUNT(*) FILTER (WHERE metadata->>'hook_status' = 'FAIL'),

    -- Status is free text; keep this conservative + non-breaking
    'abort_count', COUNT(*) FILTER (WHERE lower(status) = 'abort'),

    -- Retries exist as real integers: reliable
    'retry_count', COUNT(*) FILTER (WHERE COALESCE(total_plan_retries,0) > 0 OR COALESCE(total_shot_retries,0) > 0),

    'total_plan_retries_sum', COALESCE(SUM(COALESCE(total_plan_retries,0)), 0),
    'total_shot_retries_sum', COALESCE(SUM(COALESCE(total_shot_retries,0)), 0),

    -- Cost: try metadata.total_cost if present and numeric-like, else 0 (never crash)
    'total_cost_sum',
      COALESCE(SUM(
        CASE
          WHEN (metadata->>'total_cost') ~ '^[0-9]+(\.[0-9]+)?$' THEN (metadata->>'total_cost')::numeric
          ELSE 0
        END
      ), 0),

    'avg_cost_per_run',
      COALESCE(AVG(
        CASE
          WHEN (metadata->>'total_cost') ~ '^[0-9]+(\.[0-9]+)?$' THEN (metadata->>'total_cost')::numeric
          ELSE NULL
        END
      ), 0),

    -- Provider + R2 coverage signals (infra compliance)
    'r2_only_runs_count', COUNT(*) FILTER (
      WHERE
        COALESCE(shot_1_provider,'') = 'r2' AND COALESCE(shot_2_provider,'') = 'r2'
        AND COALESCE(shot_3_provider,'') = 'r2' AND COALESCE(shot_4_provider,'') = 'r2'
    ),
    'missing_public_url_count', COUNT(*) FILTER (
      WHERE
        COALESCE(shot_1_url,'') = '' OR COALESCE(shot_2_url,'') = ''
        OR COALESCE(shot_3_url,'') = '' OR COALESCE(shot_4_url,'') = ''
    )
  )
  INTO result
  FROM public.ads_generations
  WHERE user_id = auth.uid();

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_system_health() IS
'Backend-only aggregates for supervision UI - user-scoped via auth.uid() - MONETIQ-safe (no UI logic).';
