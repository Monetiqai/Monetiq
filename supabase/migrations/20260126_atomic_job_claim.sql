-- PHASE 3.1.5 - Atomic Job Claim
-- Adds worker_id for concurrency safety and unique constraint to prevent duplicate outputs

-- Add worker_id to music_jobs for atomic claim tracking
ALTER TABLE public.music_jobs 
ADD COLUMN worker_id UUID;

-- Add unique constraint on music_outputs to prevent duplicate outputs
ALTER TABLE public.music_outputs
ADD CONSTRAINT music_outputs_job_id_key UNIQUE (job_id);

-- Add index for faster worker_id lookups
CREATE INDEX idx_music_jobs_worker_id ON public.music_jobs(worker_id) 
WHERE worker_id IS NOT NULL;

COMMENT ON COLUMN public.music_jobs.worker_id IS 'UUID of worker that claimed this job (for concurrency safety)';
