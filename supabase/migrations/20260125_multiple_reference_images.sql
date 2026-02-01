-- Migration: Add Multiple Reference Images Support
-- Date: 2026-01-25
-- Feature: Allow multiple product images in Ads Mode

-- Add new column for multiple image asset IDs (JSON array)
ALTER TABLE public.ad_packs 
ADD COLUMN IF NOT EXISTS product_image_asset_ids JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.ad_packs.product_image_asset_ids IS 
'JSON array of asset IDs for multiple product reference images. Example: ["uuid1", "uuid2", "uuid3"]. First element is primary image.';

-- Create index for JSONB queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_ad_packs_product_image_asset_ids 
ON public.ad_packs USING GIN (product_image_asset_ids);

-- Migrate existing single images to array format (optional, for cleanup)
-- Uncomment if you want to migrate old data immediately
-- UPDATE public.ad_packs 
-- SET product_image_asset_ids = jsonb_build_array(product_image_asset_id)
-- WHERE product_image_asset_id IS NOT NULL 
--   AND product_image_asset_ids IS NULL;

-- Note: Keep product_image_asset_id for backward compatibility
-- It will be set to the first element of product_image_asset_ids
