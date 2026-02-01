-- PHASE 11 — ADS GENERATIONS TABLE WITH STRICT CONSTRAINTS
-- Created: 2026-01-24
-- Purpose: Database persistence for ads generation runs with hard constraint enforcement

-- ============================================================================
-- HELPER FUNCTIONS FOR CONSTRAINTS
-- ============================================================================

-- Check if all roles in array are unique
CREATE OR REPLACE FUNCTION check_roles_unique(roles JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT elem) = jsonb_array_length(roles)
        FROM jsonb_array_elements_text(roles) AS elem
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if all roles are from allowed set
CREATE OR REPLACE FUNCTION check_valid_roles(roles JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    allowed_roles TEXT[] := ARRAY[
        'grounded-static',
        'supported-elevated',
        'handled-transient',
        'folded-resting'
    ];
BEGIN
    RETURN (
        SELECT bool_and(elem = ANY(allowed_roles))
        FROM jsonb_array_elements_text(roles) AS elem
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- ADS_GENERATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ads_generations (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User reference
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Product info
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    template TEXT NOT NULL,
    
    -- Run info
    run_id TEXT NOT NULL UNIQUE,
    plan_seed TEXT NOT NULL,
    
    -- Plan details (JSONB arrays of strings)
    plan_roles JSONB NOT NULL,
    plan_contexts JSONB NOT NULL,
    
    -- Shot URLs
    shot_1_url TEXT,
    shot_2_url TEXT,
    shot_3_url TEXT,
    shot_4_url TEXT,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'generating',
    total_plan_retries INTEGER DEFAULT 0,
    total_shot_retries INTEGER DEFAULT 0,
    error_message TEXT,
    
    -- Metadata (detailed logs)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- ========================================================================
    -- STRICT CONSTRAINTS (HARD ENFORCEMENT)
    -- ========================================================================
    
    -- Status must be valid
    CONSTRAINT valid_status CHECK (
        status IN ('generating', 'success', 'failed', 'partial')
    ),
    
    -- plan_roles must be JSONB array of exactly 4 elements
    CONSTRAINT plan_roles_is_array_of_4 CHECK (
        jsonb_typeof(plan_roles) = 'array' 
        AND jsonb_array_length(plan_roles) = 4
    ),
    
    -- plan_contexts must be JSONB array of exactly 4 elements
    CONSTRAINT plan_contexts_is_array_of_4 CHECK (
        jsonb_typeof(plan_contexts) = 'array' 
        AND jsonb_array_length(plan_contexts) = 4
    ),
    
    -- Shot 2 (index 1) MUST be 'handled-transient'
    CONSTRAINT shot2_is_handled_transient CHECK (
        plan_roles->>1 = 'handled-transient'
    ),
    
    -- All roles must be unique (no repetition)
    CONSTRAINT roles_are_unique CHECK (
        check_roles_unique(plan_roles)
    ),
    
    -- All roles must be from allowed set
    CONSTRAINT roles_are_valid CHECK (
        check_valid_roles(plan_roles)
    )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_ads_generations_user_id ON public.ads_generations(user_id);
CREATE INDEX idx_ads_generations_run_id ON public.ads_generations(run_id);
CREATE INDEX idx_ads_generations_created_at ON public.ads_generations(created_at DESC);
CREATE INDEX idx_ads_generations_status ON public.ads_generations(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.ads_generations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own generations
-- Backend uses service role key -> bypasses RLS for INSERT/UPDATE/DELETE
CREATE POLICY "Users can view own generations"
    ON public.ads_generations
    FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ads_generations_updated_at
    BEFORE UPDATE ON public.ads_generations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.ads_generations IS 'Phase 11: Ads generation runs with strict constraint enforcement';
COMMENT ON CONSTRAINT plan_roles_is_array_of_4 ON public.ads_generations IS 'Enforces exactly 4 spatial roles';
COMMENT ON CONSTRAINT shot2_is_handled_transient ON public.ads_generations IS 'Enforces Shot 2 (proof) is always handled-transient';
COMMENT ON CONSTRAINT roles_are_unique ON public.ads_generations IS 'Enforces no role repetition';
COMMENT ON CONSTRAINT roles_are_valid ON public.ads_generations IS 'Enforces roles from allowed set only';
