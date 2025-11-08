-- Migration: Create async_jobs table with guest support
-- Purpose: Job queue table for async X/Twitter post processing
-- Date: 2025-11-08

-- Create async_jobs table
CREATE TABLE IF NOT EXISTS public.async_jobs (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job data
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,

  -- Results and errors
  result JSONB,
  error TEXT,

  -- Ownership (guest OR user, not both)
  guest_id UUID REFERENCES public.guest_users(guest_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Constraint: either guest_id OR user_id must be set (not both, not neither)
  CONSTRAINT chk_user_or_guest CHECK (
    (guest_id IS NOT NULL AND user_id IS NULL) OR
    (guest_id IS NULL AND user_id IS NOT NULL)
  ),

  -- Constraint: valid status values
  CONSTRAINT chk_valid_status CHECK (
    status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')
  ),

  -- Constraint: progress between 0 and 100
  CONSTRAINT chk_valid_progress CHECK (
    progress >= 0 AND progress <= 100
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_async_jobs_guest_id
  ON public.async_jobs(guest_id)
  WHERE guest_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_async_jobs_user_id
  ON public.async_jobs(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_async_jobs_status
  ON public.async_jobs(status);

CREATE INDEX IF NOT EXISTS idx_async_jobs_created_at
  ON public.async_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_async_jobs_updated_at
  ON public.async_jobs(updated_at DESC);

-- Composite index for active job queries
CREATE INDEX IF NOT EXISTS idx_async_jobs_active
  ON public.async_jobs(status, created_at DESC)
  WHERE status IN ('queued', 'processing');

-- Composite index for guest active jobs
CREATE INDEX IF NOT EXISTS idx_async_jobs_guest_active
  ON public.async_jobs(guest_id, status, created_at DESC)
  WHERE guest_id IS NOT NULL AND status IN ('queued', 'processing');

-- Composite index for user active jobs
CREATE INDEX IF NOT EXISTS idx_async_jobs_user_active
  ON public.async_jobs(user_id, status, created_at DESC)
  WHERE user_id IS NOT NULL AND status IN ('queued', 'processing');

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_async_jobs_cleanup
  ON public.async_jobs(status, updated_at)
  WHERE status IN ('completed', 'failed', 'cancelled');

-- Index for URL lookups
CREATE INDEX IF NOT EXISTS idx_async_jobs_url
  ON public.async_jobs(url);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_async_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_async_job_updated_at_trigger ON public.async_jobs;
CREATE TRIGGER update_async_job_updated_at_trigger
  BEFORE UPDATE ON public.async_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_async_job_updated_at();

-- Enable Row Level Security
ALTER TABLE public.async_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role has full access (for backend operations)
DROP POLICY IF EXISTS "Service role has full access" ON public.async_jobs;
CREATE POLICY "Service role has full access"
  ON public.async_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Guests and users can view own jobs
DROP POLICY IF EXISTS "Guests and users can view own jobs" ON public.async_jobs;
CREATE POLICY "Guests and users can view own jobs"
  ON public.async_jobs
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR guest_id::text = current_setting('request.headers', true)::json->>'x-guest-id'
  );

-- RLS Policy: Guests and users can insert own jobs
DROP POLICY IF EXISTS "Guests and users can insert own jobs" ON public.async_jobs;
CREATE POLICY "Guests and users can insert own jobs"
  ON public.async_jobs
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR guest_id::text = current_setting('request.headers', true)::json->>'x-guest-id'
  );

-- RLS Policy: Guests and users can update own jobs
DROP POLICY IF EXISTS "Guests and users can update own jobs" ON public.async_jobs;
CREATE POLICY "Guests and users can update own jobs"
  ON public.async_jobs
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR guest_id::text = current_setting('request.headers', true)::json->>'x-guest-id'
  );

-- RLS Policy: Guests and users can delete own jobs
DROP POLICY IF EXISTS "Guests and users can delete own jobs" ON public.async_jobs;
CREATE POLICY "Guests and users can delete own jobs"
  ON public.async_jobs
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR guest_id::text = current_setting('request.headers', true)::json->>'x-guest-id'
  );

-- Grant permissions
GRANT ALL ON public.async_jobs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.async_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.async_jobs TO anon;

-- Comments for documentation
COMMENT ON TABLE public.async_jobs IS 'Queue table for async job processing (X posts, etc.) with guest user support';
COMMENT ON COLUMN public.async_jobs.id IS 'Unique job identifier';
COMMENT ON COLUMN public.async_jobs.url IS 'URL being processed (e.g., X/Twitter post)';
COMMENT ON COLUMN public.async_jobs.status IS 'Job status: queued, processing, completed, failed, cancelled';
COMMENT ON COLUMN public.async_jobs.progress IS 'Job progress percentage (0-100)';
COMMENT ON COLUMN public.async_jobs.result IS 'Job result data (JSON) when completed';
COMMENT ON COLUMN public.async_jobs.error IS 'Error message if job failed';
COMMENT ON COLUMN public.async_jobs.guest_id IS 'Guest user ID if job created by guest (XOR with user_id)';
COMMENT ON COLUMN public.async_jobs.user_id IS 'Authenticated user ID if job created by user (XOR with guest_id)';
COMMENT ON COLUMN public.async_jobs.created_at IS 'Timestamp when job was created';
COMMENT ON COLUMN public.async_jobs.updated_at IS 'Timestamp when job was last updated (auto-updates)';
COMMENT ON COLUMN public.async_jobs.metadata IS 'Additional job metadata (JSON)';
COMMENT ON CONSTRAINT chk_user_or_guest ON public.async_jobs IS 'Ensures job has either guest_id OR user_id (not both, not neither)';
