-- Migration: Modify async_jobs table for guest support
-- Purpose: Add guest_id and user_id columns to support guest users
-- Date: 2025-11-08

-- Add new columns to async_jobs
ALTER TABLE public.async_jobs
  ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES public.guest_users(guest_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add constraint: either guest_id OR user_id must be set (not both, not neither)
ALTER TABLE public.async_jobs
  DROP CONSTRAINT IF EXISTS chk_user_or_guest;

ALTER TABLE public.async_jobs
  ADD CONSTRAINT chk_user_or_guest CHECK (
    (guest_id IS NOT NULL AND user_id IS NULL) OR
    (guest_id IS NULL AND user_id IS NOT NULL)
  );

-- Create indexes for efficient lookups
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

-- Composite index for active job queries
CREATE INDEX IF NOT EXISTS idx_async_jobs_active
  ON public.async_jobs(status, created_at DESC)
  WHERE status IN ('queued', 'processing');

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_async_jobs_cleanup
  ON public.async_jobs(status, updated_at)
  WHERE status IN ('completed', 'failed');

-- Update RLS policies for guest support
DROP POLICY IF EXISTS "Users can view own jobs" ON public.async_jobs;
DROP POLICY IF EXISTS "Users can insert own jobs" ON public.async_jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON public.async_jobs;

-- New RLS policies supporting both guests and users
CREATE POLICY "Guests and users can view own jobs"
  ON public.async_jobs
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR guest_id = current_setting('app.guest_id', true)::uuid
  );

CREATE POLICY "Guests and users can insert own jobs"
  ON public.async_jobs
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR guest_id = current_setting('app.guest_id', true)::uuid
  );

CREATE POLICY "Guests and users can update own jobs"
  ON public.async_jobs
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR guest_id = current_setting('app.guest_id', true)::uuid
  );

CREATE POLICY "Guests and users can delete own jobs"
  ON public.async_jobs
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR guest_id = current_setting('app.guest_id', true)::uuid
  );

-- Comments for documentation
COMMENT ON COLUMN public.async_jobs.guest_id IS 'Guest user ID if job was created by guest';
COMMENT ON COLUMN public.async_jobs.user_id IS 'Authenticated user ID if job was created by authenticated user';
