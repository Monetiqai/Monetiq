-- Director Node V1 - Async Queue Support
-- Add columns for async execution tracking

ALTER TABLE director_node_runs
ADD COLUMN IF NOT EXISTS placeholder_asset_id UUID REFERENCES assets(id),
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add index for efficient queued job queries
CREATE INDEX IF NOT EXISTS idx_director_node_runs_status_queued 
ON director_node_runs(status) 
WHERE status = 'queued';

-- Add index for user + status queries
CREATE INDEX IF NOT EXISTS idx_director_node_runs_user_status 
ON director_node_runs(user_id, status);
