-- Director Node Module - Database Schema
-- Created: 2026-01-28
-- ISOLATION: This migration creates NEW tables for Director Node.
-- It does NOT modify any existing Director Mode tables (scenes, assets, etc.)

-- ============================================================================
-- TABLE: director_node_graphs
-- Purpose: Store React Flow graph definitions (nodes, edges, viewport)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.director_node_graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  graph_json JSONB NOT NULL, -- { nodes: [], edges: [], viewport: {} }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.director_node_graphs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own graphs"
  ON public.director_node_graphs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own graphs"
  ON public.director_node_graphs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own graphs"
  ON public.director_node_graphs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own graphs"
  ON public.director_node_graphs FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_director_node_graphs_user_id ON public.director_node_graphs(user_id);
CREATE INDEX idx_director_node_graphs_project_id ON public.director_node_graphs(project_id);
CREATE INDEX idx_director_node_graphs_user_project ON public.director_node_graphs(user_id, project_id);

-- ============================================================================
-- TABLE: director_node_runs
-- Purpose: Track execution of individual nodes (ImageGen, VideoGen, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.director_node_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  graph_id UUID REFERENCES public.director_node_graphs(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL, -- React Flow node.id (e.g., 'node-1')
  node_type TEXT NOT NULL, -- 'Prompt', 'ImageGen', 'VideoGen', etc.
  provider TEXT, -- 'nano_banana', 'veo', 'kling', etc. (null for non-generative nodes)
  input_payload JSONB NOT NULL, -- { prompt, seed, ratio, refs, etc. }
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'running', 'success', 'failed'
  error_message TEXT,
  output_asset_id UUID REFERENCES public.assets(id), -- Link to generated asset
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.director_node_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own runs"
  ON public.director_node_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own runs"
  ON public.director_node_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own runs"
  ON public.director_node_runs FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_director_node_runs_user_id ON public.director_node_runs(user_id);
CREATE INDEX idx_director_node_runs_graph_id ON public.director_node_runs(graph_id);
CREATE INDEX idx_director_node_runs_status ON public.director_node_runs(status);
CREATE INDEX idx_director_node_runs_node_id ON public.director_node_runs(node_id);

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Verify tables exist
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'director_node%';

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'director_node%';

-- Verify policies
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename LIKE 'director_node%';

-- Verify indexes
-- SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename LIKE 'director_node%';
