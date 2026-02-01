-- ============================================================================
-- DELETE OLD EXPLORE TEMPLATES (BY ID)
-- ============================================================================
-- Deletes the 3 old templates:
-- - Creative Studio (category: "Ads")
-- - What's Next? (category: "UGC")
-- - AI Stylist (category: "Luxury")
-- ============================================================================

DELETE FROM public.landing_tools
WHERE id IN (
  '8e342195-142b-494c-8426-814f66bd7e3c',  -- Creative Studio
  '1729e2cd-2334-4505-914e-ccf793aba448',  -- What's Next?
  '77483da0-d98d-4685-ac94-fc9e6f5ee234'   -- AI Stylist
);

-- Verify deletion - should only show the 4 video model templates
SELECT 
  id,
  title, 
  subtitle,
  category,
  sort,
  is_active 
FROM public.landing_tools 
WHERE category IS NULL OR category NOT IN ('preset')
ORDER BY sort;
