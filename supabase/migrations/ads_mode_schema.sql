-- Ads Mode Database Schema
-- This migration creates the tables needed for the Ads Mode feature

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ad_packs table
CREATE TABLE IF NOT EXISTS ad_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Product Info
  product_name TEXT NOT NULL,
  product_image_asset_id UUID REFERENCES assets(id),
  category TEXT NOT NULL,
  price DECIMAL(10,2),
  
  -- Ad Configuration
  template_type TEXT NOT NULL CHECK (template_type IN ('scroll_stop', 'trust_ugc', 'problem_solution', 'offer_promo')),
  platform TEXT NOT NULL DEFAULT 'facebook' CHECK (platform IN ('facebook', 'instagram', 'tiktok')),
  variant_count INTEGER NOT NULL CHECK (variant_count IN (2, 3, 4)),
  
  -- Video Configuration
  aspect_ratio TEXT NOT NULL DEFAULT '9:16' CHECK (aspect_ratio IN ('9:16', '1:1', '16:9')),
  language TEXT NOT NULL DEFAULT 'en',
  
  -- Provider Configuration
  provider TEXT NOT NULL DEFAULT 'minimax' CHECK (provider IN ('minimax', 'runway', 'other')),
  model_fast TEXT NOT NULL DEFAULT 'MiniMax-Hailuo-2.3-Fast',
  model_final TEXT NOT NULL DEFAULT 'MiniMax-Hailuo-2.3',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'failed')),
  last_error TEXT,
  
  -- Auto-generated name
  pack_name TEXT NOT NULL,
  
  -- Metadata
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for ad_packs
CREATE INDEX IF NOT EXISTS idx_ad_packs_user_id ON ad_packs(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_packs_project_id ON ad_packs(project_id);
CREATE INDEX IF NOT EXISTS idx_ad_packs_status ON ad_packs(status);

-- Create ad_variants table
CREATE TABLE IF NOT EXISTS ad_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_pack_id UUID NOT NULL REFERENCES ad_packs(id) ON DELETE CASCADE,
  
  -- Variant Info
  variant_type TEXT NOT NULL CHECK (variant_type IN ('hook', 'trust', 'aggressive', 'offer')),
  variant_index INTEGER NOT NULL,
  
  -- Video Asset
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  
  -- Status & Provider
  is_winner BOOLEAN DEFAULT FALSE,
  is_final BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'ready', 'failed')),
  provider_job_id TEXT, -- MiniMax task_id or other provider job ID
  last_error TEXT,
  
  -- Generation Mode & Lineage
  generation_mode TEXT NOT NULL DEFAULT 'fast' CHECK (generation_mode IN ('fast', 'final')),
  source_variant_id UUID REFERENCES ad_variants(id) ON DELETE SET NULL, -- For FINAL: ID of FAST winner
  
  -- Prompt & Generation Data
  prompt_payload JSONB, -- Full generation payload (image URL, params, etc.)
  prompt_text TEXT, -- The actual prompt text (or hash for deduplication)
  
  -- Text Overlays (generated but not yet burned into video)
  hook_text TEXT,
  cta_text TEXT,
  overlay_spec JSONB, -- JSON spec for overlay positioning/timing
  
  -- Video Specs
  duration_sec INTEGER DEFAULT 6,
  
  -- Legacy field (kept for backward compatibility)
  internal_prompt TEXT, -- DEPRECATED: use prompt_text instead
  
  -- Metadata
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for ad_variants
CREATE INDEX IF NOT EXISTS idx_ad_variants_ad_pack_id ON ad_variants(ad_pack_id);
CREATE INDEX IF NOT EXISTS idx_ad_variants_asset_id ON ad_variants(asset_id);
CREATE INDEX IF NOT EXISTS idx_ad_variants_is_winner ON ad_variants(is_winner);
CREATE INDEX IF NOT EXISTS idx_ad_variants_pack_status ON ad_variants(ad_pack_id, status);

-- Add unique constraint on variant_index (allows multiple variants of same type in future)
ALTER TABLE ad_variants ADD CONSTRAINT ad_variants_unique_variant_index
  UNIQUE (ad_pack_id, variant_index);

-- Enforce DB-level: 1 winner max per pack
CREATE UNIQUE INDEX IF NOT EXISTS ux_ad_variants_one_winner_per_pack
  ON ad_variants(ad_pack_id)
  WHERE is_winner = true;

-- Enforce DB-level: 1 final max per pack
CREATE UNIQUE INDEX IF NOT EXISTS ux_ad_variants_one_final_per_pack
  ON ad_variants(ad_pack_id)
  WHERE is_final = true;

-- Enable Row Level Security
ALTER TABLE ad_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ad_packs
CREATE POLICY "Users can view their own ad packs"
  ON ad_packs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ad packs"
  ON ad_packs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ad packs"
  ON ad_packs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ad packs"
  ON ad_packs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for ad_variants
CREATE POLICY "Users can view variants of their ad packs"
  ON ad_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ad_packs
      WHERE ad_packs.id = ad_variants.ad_pack_id
      AND ad_packs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert variants for their ad packs"
  ON ad_variants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ad_packs
      WHERE ad_packs.id = ad_variants.ad_pack_id
      AND ad_packs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update variants of their ad packs"
  ON ad_variants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ad_packs
      WHERE ad_packs.id = ad_variants.ad_pack_id
      AND ad_packs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete variants of their ad packs"
  ON ad_variants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ad_packs
      WHERE ad_packs.id = ad_variants.ad_pack_id
      AND ad_packs.user_id = auth.uid()
    )
  );

-- Service role full access policies (prevents RLS blocking in server/edge contexts)
CREATE POLICY "Service role full access to ad packs"
  ON ad_packs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to ad variants"
  ON ad_variants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_ad_packs_updated_at
  BEFORE UPDATE ON ad_packs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_variants_updated_at
  BEFORE UPDATE ON ad_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
