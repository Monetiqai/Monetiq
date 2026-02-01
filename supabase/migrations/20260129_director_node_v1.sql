-- Director Node V1 - Database Migrations
-- STRICT: No Supabase Storage, R2 only

-- Table: director_node_graphs
-- Stores graph definitions (JSON)
CREATE TABLE IF NOT EXISTS director_node_graphs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Graph data
    name TEXT,
    description TEXT,
    graph_json JSONB NOT NULL, -- Full graph (nodes + edges + metadata)
    version TEXT NOT NULL DEFAULT 'v1',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT director_node_graphs_version_check CHECK (version = 'v1')
);

CREATE INDEX IF NOT EXISTS idx_director_node_graphs_user_id ON director_node_graphs(user_id);
CREATE INDEX IF NOT EXISTS idx_director_node_graphs_project_id ON director_node_graphs(project_id);
CREATE INDEX IF NOT EXISTS idx_director_node_graphs_created_at ON director_node_graphs(created_at DESC);

-- Table: director_node_runs
-- Stores execution runs (per-node results)
CREATE TABLE IF NOT EXISTS director_node_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graph_id UUID NOT NULL REFERENCES director_node_graphs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Run metadata
    status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed
    node_results JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of NodeExecutionResult
    
    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Indexes
    CONSTRAINT director_node_runs_status_check CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_director_node_runs_graph_id ON director_node_runs(graph_id);
CREATE INDEX IF NOT EXISTS idx_director_node_runs_user_id ON director_node_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_director_node_runs_started_at ON director_node_runs(started_at DESC);

-- REUSE existing assets table for images/videos
-- No new table needed, just ensure assets table has:
-- - r2_key (TEXT)
-- - public_url (TEXT)
-- - metadata (JSONB) with width, height, duration, fps, etc.

-- RLS Policies
ALTER TABLE director_node_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_node_runs ENABLE ROW LEVEL SECURITY;

-- Graphs: users can only access their own
DROP POLICY IF EXISTS director_node_graphs_select_policy ON director_node_graphs;
CREATE POLICY director_node_graphs_select_policy ON director_node_graphs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS director_node_graphs_insert_policy ON director_node_graphs;
CREATE POLICY director_node_graphs_insert_policy ON director_node_graphs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS director_node_graphs_update_policy ON director_node_graphs;
CREATE POLICY director_node_graphs_update_policy ON director_node_graphs
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS director_node_graphs_delete_policy ON director_node_graphs;
CREATE POLICY director_node_graphs_delete_policy ON director_node_graphs
    FOR DELETE USING (auth.uid() = user_id);

-- Runs: users can only access their own
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
