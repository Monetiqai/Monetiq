-- Add "queued" and "generating" to assets status check constraint
-- This allows the new Video Tool workflow to use queue -> generating -> ready status flow

-- Drop the old constraint
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_status_check;

-- Add new constraint with all statuses
ALTER TABLE assets ADD CONSTRAINT assets_status_check 
  CHECK (status IN ('pending', 'queued', 'generating', 'ready', 'failed'));
