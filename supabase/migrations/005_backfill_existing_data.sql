-- Migration: Backfill existing data (OPTIONAL)
-- Purpose: Migrate existing async_jobs to use guest_id/user_id
-- Date: 2025-11-08
-- NOTE: Only run this if you have existing data in async_jobs

-- IMPORTANT: Review and adjust this script based on your current data structure
-- This is a template - customize it for your needs

-- Step 1: Analyze current data
DO $$
DECLARE
  total_jobs INTEGER;
  jobs_without_owner INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_jobs FROM public.async_jobs;
  SELECT COUNT(*) INTO jobs_without_owner
  FROM public.async_jobs
  WHERE guest_id IS NULL AND user_id IS NULL;

  RAISE NOTICE 'Total jobs: %', total_jobs;
  RAISE NOTICE 'Jobs without owner: %', jobs_without_owner;
END $$;

-- Step 2: Create a system guest for orphaned jobs
INSERT INTO public.guest_users (guest_id, device_platform, metadata)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'legacy',
  '{"type": "system", "purpose": "backfill_orphaned_jobs"}'::jsonb
)
ON CONFLICT (guest_id) DO NOTHING;

-- Step 3: Option A - If you have a way to link jobs to users
-- Uncomment and adjust based on your schema:

/*
-- Example: If you have a user_email or similar field
UPDATE public.async_jobs aj
SET user_id = u.id
FROM auth.users u
WHERE aj.user_email = u.email
  AND aj.user_id IS NULL
  AND aj.guest_id IS NULL;
*/

/*
-- Example: If you have a created_by or owner field
UPDATE public.async_jobs aj
SET user_id = aj.created_by
WHERE aj.created_by IS NOT NULL
  AND aj.user_id IS NULL
  AND aj.guest_id IS NULL;
*/

-- Step 4: Option B - Assign orphaned jobs to system guest
-- This assigns all jobs without owner to the system guest
UPDATE public.async_jobs
SET guest_id = '00000000-0000-0000-0000-000000000000'
WHERE guest_id IS NULL
  AND user_id IS NULL;

-- Step 5: Verify backfill
DO $$
DECLARE
  total_jobs INTEGER;
  jobs_with_user INTEGER;
  jobs_with_guest INTEGER;
  jobs_without_owner INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_jobs FROM public.async_jobs;
  SELECT COUNT(*) INTO jobs_with_user FROM public.async_jobs WHERE user_id IS NOT NULL;
  SELECT COUNT(*) INTO jobs_with_guest FROM public.async_jobs WHERE guest_id IS NOT NULL;
  SELECT COUNT(*) INTO jobs_without_owner
  FROM public.async_jobs
  WHERE guest_id IS NULL AND user_id IS NULL;

  RAISE NOTICE '=== Backfill Results ===';
  RAISE NOTICE 'Total jobs: %', total_jobs;
  RAISE NOTICE 'Jobs with user_id: %', jobs_with_user;
  RAISE NOTICE 'Jobs with guest_id: %', jobs_with_guest;
  RAISE NOTICE 'Jobs without owner: % (should be 0)', jobs_without_owner;

  IF jobs_without_owner > 0 THEN
    RAISE WARNING 'Still have % jobs without owner!', jobs_without_owner;
  ELSE
    RAISE NOTICE 'All jobs have been assigned an owner ✓';
  END IF;
END $$;

-- Step 6: (Optional) Clean up very old completed jobs before migration
-- Uncomment if you want to clean up old data:

/*
DELETE FROM public.async_jobs
WHERE status IN ('completed', 'failed')
  AND updated_at < NOW() - INTERVAL '90 days';
*/

-- Step 7: Create report of backfilled data
SELECT
  CASE
    WHEN guest_id IS NOT NULL THEN 'guest'
    WHEN user_id IS NOT NULL THEN 'user'
    ELSE 'unassigned'
  END AS owner_type,
  status,
  COUNT(*) as count
FROM public.async_jobs
GROUP BY owner_type, status
ORDER BY owner_type, status;

-- Notes:
-- 1. The constraint chk_user_or_guest will prevent NULL owners going forward
-- 2. System guest (00000000-0000-0000-0000-000000000000) can be used for system jobs
-- 3. Review the report above to ensure all jobs are properly assigned
-- 4. Test thoroughly before running in production!
