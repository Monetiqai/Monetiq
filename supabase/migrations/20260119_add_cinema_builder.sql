-- ============================================================================
-- ADD CINEMA PRESETS BUILDER TO LANDING PAGE
-- ============================================================================
-- This migration adds the Cinema Presets Builder to the Presets section
-- Route: /cinema-presets
-- ============================================================================

INSERT INTO public.landing_tools (
  id,
  title,
  subtitle,
  href,
  tag,
  tag_color,
  thumb_bucket,
  thumb_path,
  media_kind,
  poster_path,
  sort,
  category,
  is_featured,
  is_active
) VALUES (
  gen_random_uuid(),
  'Cinema Builder',
  'Compose cinematic styles with director, camera, lens presets',
  '/cinema-presets',
  '🎬 PREMIUM',
  'lime',
  'landing',
  NULL,  -- TODO: Add demo video after creation
  'video',
  NULL,
  100,
  'preset',
  true,
  true
);

-- Verify insertion
SELECT 
  title,
  subtitle,
  href,
  tag,
  category,
  is_active
FROM public.landing_tools
WHERE title = 'Cinema Builder';
