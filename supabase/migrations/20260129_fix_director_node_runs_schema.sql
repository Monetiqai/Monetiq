-- Fix director_node_runs schema to match async queue requirements
-- This migration adds missing columns needed for the async execution pattern

-- Drop the old table structure and recreate with correct schema
DROP TABLE IF EXISTS director_node_runs CASCADE;

CREATE TABLE director_node_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    graph_id UUID NOT NULL REFERENCES director_node_graphs(id) ON DELETE CASCADE,
    
    -- Node identification
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    provider TEXT,
    
    -- Execution state
    status TEXT NOT NULL DEFAULT 'queued',
    error_message TEXT,
    
    -- Results
    output_payload JSONB,
    asset_url TEXT,
    placeholder_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    
    -- Metadata
    meta JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT director_node_runs_status_check 
        CHECK (status IN ('queued', 'processing', 'completed', 'failed'))
);

-- Indexes for performance
CREATE INDEX idx_director_node_runs_user_id ON director_node_runs(user_id);
CREATE INDEX idx_director_node_runs_graph_id ON director_node_runs(graph_id);
CREATE INDEX idx_director_node_runs_node_id ON director_node_runs(node_id);
CREATE INDEX idx_director_node_runs_status ON director_node_runs(status);
CREATE INDEX idx_director_node_runs_status_queued ON director_node_runs(status) WHERE status = 'queued';
CREATE INDEX idx_director_node_runs_user_status ON director_node_runs(user_id, status);
CREATE INDEX idx_director_node_runs_created_at ON director_node_runs(created_at DESC);

-- RLS Policies
ALTER TABLE director_node_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS director_node_runs_select_policy ON director_node_runs;
CREATE POLICY director_node_runs_select_policy ON director_node_runs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS director_node_runs_insert_policy ON director_node_runs;
CREATE POLICY director_node_runs_insert_policy ON director_node_runs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS director_node_runs_update_policy ON director_node_runs;
CREATE POLICY director_node_runs_update_policy ON director_node_runs
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS director_node_runs_delete_policy ON director_node_runs;
CREATE POLICY director_node_runs_delete_policy ON director_node_runs
    FOR DELETE USING (auth.uid() = user_id);
