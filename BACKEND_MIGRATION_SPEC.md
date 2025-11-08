# Backend Migration Specification
## Guest User System with Job Persistence

This document outlines the backend changes needed to support the guest user system with job persistence.

## Overview

The frontend now implements a hybrid guest/authenticated system where:
- **Saved items** remain in localStorage (fast, offline-capable)
- **Jobs** are persisted on the backend (survive reloads and navigation)
- **Guest users** are identified by a device UUID
- **Migration** occurs when users connect to Pulse Journal

## Database Schema Changes

### 1. Create `guest_users` table (Optional but recommended)

```sql
CREATE TABLE guest_users (
  guest_id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  device_platform VARCHAR(20), -- 'web', 'ios', 'android'
  migrated_to_user_id UUID REFERENCES users(id),
  migrated_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_guest_last_active ON guest_users(last_active_at);
CREATE INDEX idx_guest_migrated ON guest_users(migrated_to_user_id);
```

### 2. Create/Modify `async_jobs` table

**If table doesn't exist, use:** `supabase/migrations/000_create_async_jobs_table.sql`

**If table already exists:**
```sql
ALTER TABLE async_jobs
  ADD COLUMN guest_id UUID REFERENCES guest_users(guest_id) ON DELETE CASCADE,
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Constraint: either guest_id or user_id must be set (not both, not neither)
ALTER TABLE async_jobs
  ADD CONSTRAINT chk_user_or_guest
  CHECK (
    (guest_id IS NOT NULL AND user_id IS NULL) OR
    (guest_id IS NULL AND user_id IS NOT NULL)
  );

-- Constraint: valid status values
ALTER TABLE async_jobs
  ADD CONSTRAINT chk_valid_status
  CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled'));

-- Constraint: valid progress (0-100)
ALTER TABLE async_jobs
  ADD CONSTRAINT chk_valid_progress
  CHECK (progress >= 0 AND progress <= 100);

-- Indexes for lookups
CREATE INDEX idx_jobs_guest_id ON async_jobs(guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX idx_jobs_user_id ON async_jobs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_jobs_status ON async_jobs(status);
CREATE INDEX idx_jobs_active ON async_jobs(status, created_at DESC)
  WHERE status IN ('queued', 'processing');
CREATE INDEX idx_jobs_cleanup ON async_jobs(status, updated_at)
  WHERE status IN ('completed', 'failed', 'cancelled');

-- Trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_async_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_async_job_updated_at_trigger
  BEFORE UPDATE ON async_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_async_job_updated_at();
```

**Table Structure:**
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| url | TEXT | NO | URL being processed |
| status | TEXT | NO | One of: queued, processing, completed, failed, cancelled |
| progress | INTEGER | NO | 0-100 percentage |
| result | JSONB | YES | Result data when completed |
| error | TEXT | YES | Error message if failed |
| guest_id | UUID | YES | Guest user ID (XOR with user_id) |
| user_id | UUID | YES | Authenticated user ID (XOR with guest_id) |
| created_at | TIMESTAMPTZ | NO | Timestamp of creation |
| updated_at | TIMESTAMPTZ | NO | Auto-updated on changes |
| metadata | JSONB | NO | Additional job metadata |

## API Endpoints to Modify

### 1. POST `/api/x/process-async`

**Current Request:**
```json
{
  "url": "https://x.com/..."
}
```

**New Request:**
```json
{
  "url": "https://x.com/...",
  "guestId": "uuid-here",  // OR
  "userId": "uuid-here"    // One of these must be present
}
```

**Implementation:**
- Accept both `X-Guest-Id` header and `guestId` in body
- Accept both `X-User-Id` header and `userId` in body
- Store the association in the `async_jobs` table
- Update `last_active_at` in `guest_users` if guest

### 2. GET `/api/x/job-status/:jobId`

**Current Behavior:**
- Returns job status for any jobId

**New Behavior:**
- Accept `X-Guest-Id` or `X-User-Id` header
- Verify that the job belongs to the requesting guest/user
- Return 403 if job doesn't belong to requester

**Security Note:** This prevents guests from accessing other people's jobs.

### 3. POST `/api/x/cancel-job/:jobId`

Same changes as job-status - verify ownership before canceling.

## New API Endpoints to Create

### 1. GET `/api/jobs/active`

Get all active jobs for current session (guest or authenticated).

**Headers:**
- `X-Guest-Id: uuid` OR `X-User-Id: uuid`

**Response:**
```json
{
  "success": true,
  "jobs": [
    {
      "jobId": "job-uuid",
      "url": "https://x.com/...",
      "status": "processing",
      "progress": 45,
      "createdAt": "2025-11-08T...",
      "itemId": "optional-saved-item-id"
    }
  ]
}
```

**Implementation (using Supabase function):**
```javascript
// Backend endpoint implementation
app.get('/api/jobs/active', async (req, res) => {
  const guestId = req.headers['x-guest-id'];
  const userId = req.headers['x-user-id'];

  const { data, error } = await supabase.rpc('get_active_jobs', {
    p_guest_id: guestId || null,
    p_user_id: userId || null
  });

  if (error) {
    return res.status(500).json({ success: false, error });
  }

  res.json({
    success: true,
    jobs: data.map(job => ({
      jobId: job.job_id,
      url: job.url,
      status: job.status,
      progress: job.progress,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      metadata: job.metadata
    }))
  });
});
```

**Or direct SQL:**
```sql
SELECT id as job_id, url, status, progress, created_at, updated_at, metadata
FROM async_jobs
WHERE (guest_id = $1 OR user_id = $2)
  AND status IN ('queued', 'processing')
ORDER BY created_at DESC;
```

### 2. GET `/api/jobs/guest-pending/:guestId`

Get count of pending jobs for a guest (used for migration preview).

**Response:**
```json
{
  "success": true,
  "pendingJobs": 3
}
```

**Implementation (using Supabase function):**
```javascript
app.get('/api/jobs/guest-pending/:guestId', async (req, res) => {
  const { guestId } = req.params;

  const { data, error } = await supabase.rpc('get_guest_pending_jobs_count', {
    p_guest_id: guestId
  });

  if (error) {
    return res.status(500).json({ success: false, error });
  }

  res.json({
    success: true,
    pendingJobs: data || 0
  });
});
```

### 3. POST `/api/jobs/migrate-guest`

Migrate all jobs from guest to authenticated user.

**Request:**
```json
{
  "guestId": "guest-uuid",
  "userId": "user-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "migratedJobs": 3
}
```

**Implementation (using Supabase function):**
```javascript
app.post('/api/jobs/migrate-guest', async (req, res) => {
  const { guestId, userId } = req.body;

  if (!guestId || !userId) {
    return res.status(400).json({
      success: false,
      error: { message: 'guestId and userId are required' }
    });
  }

  const { data, error } = await supabase.rpc('migrate_guest_jobs', {
    p_guest_id: guestId,
    p_user_id: userId
  });

  if (error) {
    return res.status(500).json({ success: false, error });
  }

  const result = data[0];
  res.json({
    success: result.success,
    migratedJobs: result.migrated_count,
    message: result.message
  });
});
```

**Or direct SQL:**
```sql
-- Update all jobs from guest to user
UPDATE async_jobs
SET user_id = $1, guest_id = NULL
WHERE guest_id = $2;

-- Mark guest as migrated
UPDATE guest_users
SET migrated_to_user_id = $1, migrated_at = NOW()
WHERE guest_id = $2;
```

### 4. POST `/api/jobs/cleanup` (Optional)

Clean up completed jobs older than specified days (default 7).

**Implementation (using Supabase function):**
```javascript
app.post('/api/jobs/cleanup', async (req, res) => {
  const daysOld = req.body.daysOld || 7;

  const { data, error } = await supabase.rpc('cleanup_old_jobs', {
    p_days_old: daysOld
  });

  if (error) {
    return res.status(500).json({ success: false, error });
  }

  const result = data[0];
  res.json({
    success: result.success,
    deletedCount: result.deleted_count,
    message: result.message
  });
});
```

**Or direct SQL:**
```sql
DELETE FROM async_jobs
WHERE status IN ('completed', 'failed', 'cancelled')
  AND updated_at < NOW() - INTERVAL '7 days';
```

## Middleware Changes

### Create Session Identifier Middleware

```javascript
// middleware/sessionIdentifier.js
function extractSessionIdentifier(req, res, next) {
  // Try headers first
  const guestId = req.headers['x-guest-id'];
  const userId = req.headers['x-user-id'];

  // Try body as fallback
  const bodyGuestId = req.body?.guestId;
  const bodyUserId = req.body?.userId;

  // Attach to request
  req.session = {
    guestId: guestId || bodyGuestId,
    userId: userId || bodyUserId,
    type: (userId || bodyUserId) ? 'authenticated' : 'guest'
  };

  // Validation
  if (!req.session.guestId && !req.session.userId) {
    return res.status(400).json({
      success: false,
      error: { message: 'Either guest_id or user_id required' }
    });
  }

  next();
}
```

Apply this middleware to all job-related endpoints.

## Background Jobs (Cron)

### 1. Clean up old guest users

Run daily to remove inactive guest users:

```sql
-- Delete guests inactive for 30+ days (not migrated)
DELETE FROM guest_users
WHERE last_active_at < NOW() - INTERVAL '30 days'
  AND migrated_to_user_id IS NULL;
```

### 2. Clean up old completed jobs

Run daily to remove old completed jobs:

```sql
DELETE FROM async_jobs
WHERE status IN ('completed', 'failed')
  AND updated_at < NOW() - INTERVAL '7 days';
```

## Testing Checklist

- [ ] Guest can create job with guest_id
- [ ] Guest can check job status
- [ ] Guest can't access another guest's jobs
- [ ] GET `/api/jobs/active` returns only guest's jobs
- [ ] User can create job with user_id
- [ ] Migration transfers all guest jobs to user
- [ ] After migration, user can access previously-guest jobs
- [ ] Jobs persist across page reloads
- [ ] Jobs continue processing when user navigates away
- [ ] Cleanup cron removes old data

## Migration Strategy

### Phase 1: Update existing jobs table
- Add nullable columns `guest_id` and `user_id`
- Backfill `user_id` for existing jobs if user tracking exists
- Add indexes

### Phase 2: Update endpoints
- Modify process-async to accept guest_id/user_id
- Add session middleware
- Add ownership verification

### Phase 3: Add new endpoints
- Implement /active, /migrate-guest, etc.
- Test thoroughly

### Phase 4: Create guest_users table (optional)
- Can be added later if needed for analytics
- Not strictly required for functionality

## Security Considerations

1. **Job Ownership Verification**: Always verify guest_id/user_id matches before returning job data
2. **Rate Limiting**: Implement rate limiting per guest_id to prevent abuse
3. **Guest Data Expiry**: Automatically clean up old guest data
4. **No PII in Guest Records**: Don't store personally identifiable information for guests
5. **Migration Security**: Verify user authentication before migrating guest data

## Frontend Headers Reference

The frontend now sends these headers on all job-related requests:

```
X-Guest-Id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
OR
X-User-Id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

Content-Type: application/json
```

The backend should accept either header and use it for job association and retrieval.

## Questions?

Contact the frontend team if you need clarification on:
- Frontend implementation details
- Expected request/response formats
- Edge cases or error handling
