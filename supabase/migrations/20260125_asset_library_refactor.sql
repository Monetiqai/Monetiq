-- Asset Library Refactor Migration
-- Adds category, is_primary, group_id columns for better organization

-- 1. Add new columns
ALTER TABLE assets ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS group_id TEXT;

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_group_id ON assets(group_id);
CREATE INDEX IF NOT EXISTS idx_assets_user_role_status ON assets(user_id, role, status);

-- 3. Populate category with robust logic
UPDATE assets 
SET category = CASE
  -- Ads Mode: if linked to ad_pack or variant
  WHEN meta->>'ad_pack_id' IS NOT NULL OR meta->>'variant_id' IS NOT NULL THEN 'ads_mode'
  WHEN role IN ('hook', 'proof', 'variation', 'winner', 'ad_final') THEN 'ads_mode'
  
  -- Director Mode: if linked to scenes/sequences
  WHEN meta->>'scene_id' IS NOT NULL OR meta->>'sequence_id' IS NOT NULL THEN 'director_mode'
  WHEN role IN ('scene', 'shot', 'sequence', 'storyboard') THEN 'director_mode'
  
  -- Uploads: everything else (product images, manual uploads)
  ELSE 'uploads'
END
WHERE category IS NULL;

-- 4. Mark primary images (first image of each group)
UPDATE assets a1
SET is_primary = true
WHERE role = 'product_image'
  AND group_id IS NOT NULL
  AND id = (
    SELECT id FROM assets a2 
    WHERE a2.group_id = a1.group_id 
    ORDER BY created_at ASC 
    LIMIT 1
  );

-- 5. Add comment for documentation
COMMENT ON COLUMN assets.category IS 'Asset category: ads_mode, director_mode, or uploads';
COMMENT ON COLUMN assets.is_primary IS 'True if this is the primary image in a multi-image set';
COMMENT ON COLUMN assets.group_id IS 'Groups related assets together (e.g., product image + angles)';
