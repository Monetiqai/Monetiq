-- ============================================================================
-- UPDATE CINEMA BUILDER TO DIRECTOR MODE
-- ============================================================================
-- Remove old Cinema Builder entry (if exists)
-- Director Mode is now accessed via hero section, not preset list
-- ============================================================================

-- Delete Cinema Builder from landing_tools
DELETE FROM public.landing_tools
WHERE title = 'Cinema Builder';

-- Verify deletion
SELECT 
  title,
  href,
  category
FROM public.landing_tools
WHERE title LIKE '%Cinema%' OR title LIKE '%Director%';
