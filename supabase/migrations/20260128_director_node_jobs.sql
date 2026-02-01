-- Director Node Jobs - Database Schema
-- Created: 2026-01-28
-- Purpose: Track async image/video generation jobs for Director Node

-- ============================================================================
-- TABLE: director_node_jobs
-- Purpose: Store generative jobs (image/video) with worker processing
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.director_node_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  graph_id UUID REFERENCES public.director_node_graphs(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL, -- React Flow node.id
  kind TEXT NOT NULL, -- 'image' | 'video'
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued' | 'running' | 'succeeded' | 'failed'
  provider TEXT NOT NULL, -- 'nano_banana', 'chatgpt_image', 'seeddream', 'veo', 'kling'
  payload JSONB NOT NULL, -- { prompt, seed, ratio, resolution, etc. }
  output_url TEXT, -- R2 public URL
  output_asset_id UUID REFERENCES public.assets(id),
  error_message TEXT,
  worker_id UUID, -- For atomic job claiming
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.director_node_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON public.director_node_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs"
  ON public.director_node_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON public.director_node_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_director_node_jobs_user_id ON public.director_node_jobs(user_id);
CREATE INDEX idx_director_node_jobs_graph_id ON public.director_node_jobs(graph_id);
CREATE INDEX idx_director_node_jobs_status ON public.director_node_jobs(status);
CREATE INDEX idx_director_node_jobs_node_id ON public.director_node_jobs(node_id);
CREATE INDEX idx_director_node_jobs_worker_id ON public.director_node_jobs(worker_id);

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Verify table exists
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'director_node_jobs';

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'director_node_jobs';

-- Verify policies
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'director_node_jobs';

-- Verify indexes
-- SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'director_node_jobs';
