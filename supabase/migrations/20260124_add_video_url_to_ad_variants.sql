-- Add video_url column to ad_variants table
-- This stores the signed URL for the generated video

ALTER TABLE ad_variants
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN ad_variants.video_url IS 'Signed URL for the generated video (valid for 1 year)';
