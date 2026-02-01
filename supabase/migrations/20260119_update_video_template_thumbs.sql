-- ============================================================================
-- UPDATE VIDEO MODEL TEMPLATES WITH DEMO VIDEOS
-- ============================================================================
-- Updates the thumb_path for the 4 video model templates
-- Videos are stored in: storage/landing/
-- ============================================================================

-- Update Gen-4 Turbo
UPDATE public.landing_tools
SET 
  thumb_bucket = 'landing',
  thumb_path = 'gen4_turbo.mp4',  -- Adjust filename if different
  media_kind = 'video'
WHERE title = 'Gen-4 Turbo';

-- Update Gen-3 Turbo
UPDATE public.landing_tools
SET 
  thumb_bucket = 'landing',
  thumb_path = 'gen3_turbo.mp4',  -- Adjust filename if different
  media_kind = 'video'
WHERE title = 'Gen-3 Turbo';

-- Update Veo 3
UPDATE public.landing_tools
SET 
  thumb_bucket = 'landing',
  thumb_path = 'veo3.mp4',  -- Adjust filename if different
  media_kind = 'video'
WHERE title = 'Veo 3';

-- Update Veo 3.1
UPDATE public.landing_tools
SET 
  thumb_bucket = 'landing',
  thumb_path = 'veo3.1.mp4',  -- Adjust filename if different
  media_kind = 'video'
WHERE title = 'Veo 3.1';

-- Verify updates
SELECT 
  title,
  thumb_bucket,
  thumb_path,
  media_kind
FROM public.landing_tools
WHERE title IN ('Gen-4 Turbo', 'Gen-3 Turbo', 'Veo 3', 'Veo 3.1')
ORDER BY sort;
