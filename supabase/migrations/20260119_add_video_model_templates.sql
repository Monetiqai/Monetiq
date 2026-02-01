-- ============================================================================
-- ADD VIDEO MODEL TEMPLATES TO LANDING PAGE
-- ============================================================================
-- This migration adds 4 video model templates to the Explorer section:
-- - Gen-4 Turbo (fastest)
-- - Gen-3 Turbo (fast)
-- - Veo 3 (premium)
-- - Veo 3.1 (ultra premium)
--
-- Each template links to /video?model=xxx for pre-selection
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
) VALUES
-- Gen-4 Turbo ⚡
(
  gen_random_uuid(),
  'Gen-4 Turbo',
  'Ultra-fast video generation • 2-10s • 6 aspect ratios',
  '/video?model=gen4_turbo',
  '⚡ FASTEST',
  'sky',
  'assets',
  NULL,  -- TODO: Add demo video path after generation
  'video',
  NULL,
  10,
  NULL,  -- category=NULL means "Explore" section
  false,
  true
),
-- Gen-3 Turbo ⚡
(
  gen_random_uuid(),
  'Gen-3 Turbo',
  'Fast & reliable • 5-10s • HD quality',
  '/video?model=gen3a_turbo',
  '⚡ FAST',
  'sky',
  'assets',
  NULL,  -- TODO: Add demo video path
  'video',
  NULL,
  11,
  NULL,
  false,
  true
),
-- Veo 3 🎨
(
  gen_random_uuid(),
  'Veo 3',
  'Premium quality • 8s • Full HD',
  '/video?model=veo3',
  '🎨 PREMIUM',
  'lime',
  'assets',
  NULL,  -- TODO: Add demo video path
  'video',
  NULL,
  12,
  NULL,
  false,
  true
),
-- Veo 3.1 💎
(
  gen_random_uuid(),
  'Veo 3.1',
  'Ultra premium • 4-8s • 4K ready',
  '/video?model=veo3.1',
  '💎 ULTRA',
  'lime',
  'assets',
  NULL,  -- TODO: Add demo video path
  'video',
  NULL,
  13,
  NULL,
  false,
  true
);

-- Verify insertion
SELECT 
  title, 
  tag, 
  href, 
  sort, 
  is_active 
FROM public.landing_tools 
WHERE title LIKE '%Turbo%' OR title LIKE '%Veo%'
ORDER BY sort;
