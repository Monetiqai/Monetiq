-- ADD PRODUCT_IMAGE_URL TO PROJECTS TABLE
-- Created: 2026-01-25
-- Purpose: Support R2 public URLs for product images

-- Add product_image_url field to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS product_image_url TEXT;

-- Add comment
COMMENT ON COLUMN public.projects.product_image_url IS 'R2 public URL for product image (replaces product_image_path)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_product_image_url ON public.projects(product_image_url);
