-- Update ad_variants status constraint to support AAA image generation flow

-- Step 1: Drop the old constraint first (so we can update existing rows)
ALTER TABLE ad_variants DROP CONSTRAINT IF EXISTS ad_variants_status_check;

-- Step 2: Fix any existing rows with invalid statuses
-- Reset any 'generating_shots' to 'queued' (they'll be regenerated)
UPDATE ad_variants 
SET status = 'queued' 
WHERE status NOT IN ('queued', 'generating', 'ready', 'failed');

-- Step 3: Add the new constraint with all statuses (old + new)
ALTER TABLE ad_variants ADD CONSTRAINT ad_variants_status_check 
CHECK (status IN (
    'queued',           -- Initial state
    'generating',       -- Old video generation (legacy)
    'generating_shots', -- NEW: Generating AAA images
    'shots_ready',      -- NEW: 4 shots generated, ready for validation
    'shots_partial',    -- NEW: Some shots failed
    'shots_validated',  -- NEW: User validated the 4 shots
    'ready',            -- Final video ready (or legacy completion)
    'failed'            -- Generation failed
));
