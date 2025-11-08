-- Migration: Create cron jobs for automatic cleanup
-- Purpose: Schedule automatic cleanup of old jobs and inactive guests
-- Date: 2025-11-08
-- Note: Requires pg_cron extension (available in Supabase Pro)

-- Enable pg_cron extension if not already enabled
-- Note: This may require Supabase Pro plan
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup of old completed jobs (runs daily at 2 AM UTC)
-- Uncomment if using Supabase Pro with pg_cron:
/*
SELECT cron.schedule(
  'cleanup-old-jobs',           -- job name
  '0 2 * * *',                  -- cron schedule (2 AM UTC daily)
  $$SELECT public.cleanup_old_jobs(7);$$ -- delete jobs older than 7 days
);
*/

-- Schedule cleanup of inactive guests (runs weekly on Sunday at 3 AM UTC)
-- Uncomment if using Supabase Pro with pg_cron:
/*
SELECT cron.schedule(
  'cleanup-inactive-guests',    -- job name
  '0 3 * * 0',                 -- cron schedule (3 AM UTC on Sundays)
  $$SELECT public.cleanup_inactive_guests(30);$$ -- delete guests inactive for 30+ days
);
*/

-- Alternative: Create a manual cleanup function for Supabase Free tier
-- Call this via an Edge Function or scheduled GitHub Action
CREATE OR REPLACE FUNCTION public.run_scheduled_cleanup()
RETURNS TABLE (
  jobs_deleted INTEGER,
  guests_deleted INTEGER,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_jobs_deleted INTEGER;
  v_guests_deleted INTEGER;
BEGIN
  -- Clean up old jobs
  SELECT deleted_count INTO v_jobs_deleted
  FROM public.cleanup_old_jobs(7);

  -- Clean up inactive guests
  SELECT deleted_count INTO v_guests_deleted
  FROM public.cleanup_inactive_guests(30);

  RETURN QUERY SELECT
    v_jobs_deleted,
    v_guests_deleted,
    true,
    format('Cleaned %s jobs and %s guests', v_jobs_deleted, v_guests_deleted)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.run_scheduled_cleanup TO authenticated;

COMMENT ON FUNCTION public.run_scheduled_cleanup IS 'Run all scheduled cleanup tasks (for manual or external scheduling)';

-- Instructions for Supabase Free tier:
-- 1. Create a GitHub Action that calls this function daily
-- 2. Or create a Supabase Edge Function triggered by a cron service
-- 3. Or call it manually from your backend API on a schedule
