-- Migration: Create functions for guest job management
-- Purpose: Helper functions for job queries and migration
-- Date: 2025-11-08

-- Function: Get active jobs for current session (guest or user)
CREATE OR REPLACE FUNCTION public.get_active_jobs(
  p_guest_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  job_id UUID,
  url TEXT,
  status TEXT,
  progress INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    aj.id AS job_id,
    aj.url,
    aj.status,
    aj.progress,
    aj.created_at,
    aj.updated_at,
    aj.metadata
  FROM public.async_jobs aj
  WHERE
    (p_guest_id IS NOT NULL AND aj.guest_id = p_guest_id)
    OR (p_user_id IS NOT NULL AND aj.user_id = p_user_id)
  AND aj.status IN ('queued', 'processing')
  ORDER BY aj.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get active job count for guest
CREATE OR REPLACE FUNCTION public.get_guest_pending_jobs_count(
  p_guest_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  job_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO job_count
  FROM public.async_jobs
  WHERE guest_id = p_guest_id
    AND status IN ('queued', 'processing');

  RETURN job_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Migrate guest jobs to authenticated user
CREATE OR REPLACE FUNCTION public.migrate_guest_jobs(
  p_guest_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  migrated_count INTEGER,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_migrated_count INTEGER;
BEGIN
  -- Validate inputs
  IF p_guest_id IS NULL OR p_user_id IS NULL THEN
    RETURN QUERY SELECT 0, false, 'Invalid guest_id or user_id'::TEXT;
    RETURN;
  END IF;

  -- Check if guest exists
  IF NOT EXISTS (SELECT 1 FROM public.guest_users WHERE guest_id = p_guest_id) THEN
    -- Insert guest record if it doesn't exist
    INSERT INTO public.guest_users (guest_id, device_platform)
    VALUES (p_guest_id, 'unknown')
    ON CONFLICT (guest_id) DO NOTHING;
  END IF;

  -- Migrate all jobs from guest to user
  UPDATE public.async_jobs
  SET user_id = p_user_id, guest_id = NULL
  WHERE guest_id = p_guest_id;

  GET DIAGNOSTICS v_migrated_count = ROW_COUNT;

  -- Mark guest as migrated
  UPDATE public.guest_users
  SET migrated_to_user_id = p_user_id, migrated_at = NOW()
  WHERE guest_id = p_guest_id;

  -- Return result
  RETURN QUERY SELECT
    v_migrated_count,
    true,
    format('Successfully migrated %s jobs', v_migrated_count)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if job belongs to session
CREATE OR REPLACE FUNCTION public.verify_job_ownership(
  p_job_id UUID,
  p_guest_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_belongs BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.async_jobs
    WHERE id = p_job_id
      AND (
        (p_guest_id IS NOT NULL AND guest_id = p_guest_id)
        OR (p_user_id IS NOT NULL AND user_id = p_user_id)
      )
  ) INTO v_belongs;

  RETURN v_belongs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cleanup old completed jobs
CREATE OR REPLACE FUNCTION public.cleanup_old_jobs(
  p_days_old INTEGER DEFAULT 7
)
RETURNS TABLE (
  deleted_count INTEGER,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.async_jobs
  WHERE status IN ('completed', 'failed')
    AND updated_at < NOW() - (p_days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN QUERY SELECT
    v_deleted_count,
    true,
    format('Deleted %s old jobs', v_deleted_count)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cleanup inactive guest users
CREATE OR REPLACE FUNCTION public.cleanup_inactive_guests(
  p_days_inactive INTEGER DEFAULT 30
)
RETURNS TABLE (
  deleted_count INTEGER,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.guest_users
  WHERE last_active_at < NOW() - (p_days_inactive || ' days')::INTERVAL
    AND migrated_to_user_id IS NULL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN QUERY SELECT
    v_deleted_count,
    true,
    format('Deleted %s inactive guests', v_deleted_count)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_active_jobs TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_guest_pending_jobs_count TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.migrate_guest_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_job_ownership TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_inactive_guests TO authenticated;

-- Comments
COMMENT ON FUNCTION public.get_active_jobs IS 'Get all active jobs for a guest or authenticated user';
COMMENT ON FUNCTION public.migrate_guest_jobs IS 'Migrate all jobs from guest to authenticated user';
COMMENT ON FUNCTION public.cleanup_old_jobs IS 'Delete completed/failed jobs older than specified days';
COMMENT ON FUNCTION public.cleanup_inactive_guests IS 'Delete inactive guest users';
