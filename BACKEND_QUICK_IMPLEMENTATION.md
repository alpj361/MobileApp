# Backend Quick Implementation Guide
## Guest User System - Minimum Changes Required

**Context:** The mobile app (MobileApp repo) now sends `guest_id` or `user_id` in all job requests. The Supabase tables are already migrated and ready. You just need to modify the backend (extractorw-api) to accept and use these IDs.

**Time to implement:** 10-15 minutes

---

## ⚡ TL;DR - What Changed

The frontend now sends:
- **Header:** `X-Guest-Id: uuid` (for guest users)
- **Header:** `X-User-Id: uuid` (for authenticated users)
- **Body:** `{ url, guestId: "uuid" }` or `{ url, userId: "uuid" }`

Your job: Make the backend accept these and save them to the database.

---

## 📋 Files to Modify (Find These)

Look for these files in extractorw-api:

1. **The file handling `POST /api/x/process-async`**
   - Likely: `routes/x.js`, `routes/jobs.js`, or similar
   - This creates async jobs

2. **Main router/app file** (to add new endpoints)
   - Likely: `index.js`, `app.js`, `server.js`, or `routes/index.js`

---

## 🔧 Change #1: Modify POST /api/x/process-async

### Find this code (approximately):
```javascript
app.post('/api/x/process-async', async (req, res) => {
  const { url } = req.body;

  const jobId = uuidv4();
  const job = {
    id: jobId,
    url,
    status: 'queued',
    progress: 0,
    created_at: new Date(),
    updated_at: new Date()
  };

  await supabase.from('async_jobs').insert(job);

  res.json({ success: true, jobId });
});
```

### Change it to this:
```javascript
app.post('/api/x/process-async', async (req, res) => {
  const { url, guestId, userId } = req.body;

  // Extract from headers as fallback
  const finalGuestId = guestId || req.headers['x-guest-id'];
  const finalUserId = userId || req.headers['x-user-id'];

  // Validate: must have one of them
  if (!finalGuestId && !finalUserId) {
    return res.status(400).json({
      success: false,
      error: { message: 'Either guestId or userId required' }
    });
  }

  const jobId = uuidv4();
  const job = {
    id: jobId,
    url,
    status: 'queued',
    progress: 0,
    guest_id: finalGuestId || null,    // ⬅️ NEW
    user_id: finalUserId || null,      // ⬅️ NEW
    created_at: new Date(),
    updated_at: new Date()
  };

  const { error } = await supabase.from('async_jobs').insert(job);

  if (error) {
    console.error('[process-async] Error creating job:', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }

  // Update guest last_active_at (optional but recommended)
  if (finalGuestId) {
    await supabase
      .from('guest_users')
      .upsert({
        guest_id: finalGuestId,
        last_active_at: new Date()
      }, {
        onConflict: 'guest_id'
      })
      .catch(err => console.warn('[process-async] Failed to update guest:', err));
  }

  res.json({ success: true, jobId });
});
```

**Key changes:**
1. Extract `guestId`/`userId` from body and headers
2. Validate at least one exists
3. Add `guest_id` and `user_id` to the job object
4. (Optional) Update `guest_users.last_active_at`

---

## 🔧 Change #2: Add GET /api/jobs/active (NEW ENDPOINT)

**Why:** Allows frontend to recover active jobs after page reload.

**Add this endpoint:**
```javascript
app.get('/api/jobs/active', async (req, res) => {
  const guestId = req.headers['x-guest-id'];
  const userId = req.headers['x-user-id'];

  try {
    // Use Supabase function (recommended)
    const { data, error } = await supabase.rpc('get_active_jobs', {
      p_guest_id: guestId || null,
      p_user_id: userId || null
    });

    if (error) throw error;

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
  } catch (error) {
    console.error('[jobs/active] Error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});
```

**Alternative (if Supabase function doesn't work):**
```javascript
app.get('/api/jobs/active', async (req, res) => {
  const guestId = req.headers['x-guest-id'];
  const userId = req.headers['x-user-id'];

  try {
    let query = supabase
      .from('async_jobs')
      .select('id, url, status, progress, created_at, updated_at, metadata')
      .in('status', ['queued', 'processing'])
      .order('created_at', { ascending: false });

    // Filter by guest_id or user_id
    if (guestId) {
      query = query.eq('guest_id', guestId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Either X-Guest-Id or X-User-Id header required' }
      });
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      jobs: data.map(job => ({
        jobId: job.id,
        url: job.url,
        status: job.status,
        progress: job.progress,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        metadata: job.metadata
      }))
    });
  } catch (error) {
    console.error('[jobs/active] Error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});
```

---

## 🔧 Change #3: Add POST /api/jobs/migrate-guest (NEW ENDPOINT)

**Why:** When user connects to Pulse Journal, migrate their guest jobs to their user account.

**Add this endpoint:**
```javascript
app.post('/api/jobs/migrate-guest', async (req, res) => {
  const { guestId, userId } = req.body;

  if (!guestId || !userId) {
    return res.status(400).json({
      success: false,
      error: { message: 'Both guestId and userId are required' }
    });
  }

  try {
    // Use Supabase function (recommended)
    const { data, error } = await supabase.rpc('migrate_guest_jobs', {
      p_guest_id: guestId,
      p_user_id: userId
    });

    if (error) throw error;

    const result = data[0];
    res.json({
      success: result.success,
      migratedJobs: result.migrated_count,
      message: result.message
    });
  } catch (error) {
    console.error('[jobs/migrate] Error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});
```

**Alternative (raw SQL if function doesn't work):**
```javascript
app.post('/api/jobs/migrate-guest', async (req, res) => {
  const { guestId, userId } = req.body;

  if (!guestId || !userId) {
    return res.status(400).json({
      success: false,
      error: { message: 'Both guestId and userId are required' }
    });
  }

  try {
    // Update all jobs from guest to user
    const { data: jobs, error: updateError } = await supabase
      .from('async_jobs')
      .update({ user_id: userId, guest_id: null })
      .eq('guest_id', guestId)
      .select();

    if (updateError) throw updateError;

    // Mark guest as migrated
    await supabase
      .from('guest_users')
      .update({
        migrated_to_user_id: userId,
        migrated_at: new Date()
      })
      .eq('guest_id', guestId);

    res.json({
      success: true,
      migratedJobs: jobs.length,
      message: `Successfully migrated ${jobs.length} job(s)`
    });
  } catch (error) {
    console.error('[jobs/migrate] Error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});
```

---

## ✅ Testing After Changes

### Test 1: Create Job as Guest
```bash
curl -X POST http://localhost:YOUR_PORT/api/x/process-async \
  -H "Content-Type: application/json" \
  -H "X-Guest-Id: 11111111-1111-1111-1111-111111111111" \
  -d '{"url": "https://x.com/test/status/123"}'

# Expected response:
# { "success": true, "jobId": "some-uuid" }
```

### Test 2: Verify in Database
```sql
-- In Supabase SQL Editor
SELECT id, url, status, guest_id, user_id
FROM async_jobs
ORDER BY created_at DESC
LIMIT 1;

-- Should show:
-- guest_id: 11111111-1111-1111-1111-111111111111
-- user_id: null
```

### Test 3: Get Active Jobs
```bash
curl -X GET http://localhost:YOUR_PORT/api/jobs/active \
  -H "X-Guest-Id: 11111111-1111-1111-1111-111111111111"

# Expected response:
# { "success": true, "jobs": [...] }
```

### Test 4: Migrate Jobs
```bash
curl -X POST http://localhost:YOUR_PORT/api/jobs/migrate-guest \
  -H "Content-Type: application/json" \
  -d '{
    "guestId": "11111111-1111-1111-1111-111111111111",
    "userId": "22222222-2222-2222-2222-222222222222"
  }'

# Expected response:
# { "success": true, "migratedJobs": 1, "message": "..." }
```

---

## 🚨 Common Issues

### Issue: "new row violates check constraint chk_user_or_guest"

**Cause:** Job was created without `guest_id` OR `user_id`

**Fix:** Make sure you're setting one of them:
```javascript
guest_id: finalGuestId || null,
user_id: finalUserId || null,
```

### Issue: "function get_active_jobs does not exist"

**Cause:** Supabase migrations not applied

**Fix:**
1. Go to Supabase SQL Editor
2. Run: `supabase/migrations/003_create_guest_job_functions.sql`
3. Or use the alternative raw SQL version (provided above)

### Issue: Jobs not appearing in GET /jobs/active

**Cause:**
- Guest ID doesn't match
- Job status is not 'queued' or 'processing'

**Fix:**
```sql
-- Check what's in the DB
SELECT id, guest_id, user_id, status
FROM async_jobs
WHERE guest_id = 'your-guest-id';
```

---

## 📝 Summary of Changes

**Minimum to work (5 min):**
- ✅ Modify POST `/api/x/process-async` - Accept and save guest_id/user_id

**Full functionality (15 min):**
- ✅ Modify POST `/api/x/process-async` - Accept and save guest_id/user_id
- ✅ Add GET `/api/jobs/active` - Return active jobs for session
- ✅ Add POST `/api/jobs/migrate-guest` - Migrate jobs on login

**Optional enhancements:**
- ⬜ Add middleware to extract guest_id/user_id from headers
- ⬜ Add GET `/api/jobs/guest-pending/:guestId` - Count pending jobs
- ⬜ Add POST `/api/jobs/cleanup` - Manual cleanup trigger
- ⬜ Update GET `/api/x/job-status/:jobId` - Verify ownership

---

## 🎯 Where to Add New Endpoints

Look for one of these patterns in your code:

**Pattern 1: Router file**
```javascript
// routes/jobs.js or routes/x.js
const router = express.Router();

router.post('/process-async', ...);
router.get('/active', ...);           // ⬅️ ADD HERE
router.post('/migrate-guest', ...);   // ⬅️ ADD HERE

module.exports = router;
```

**Pattern 2: Main app file**
```javascript
// index.js or app.js
app.post('/api/x/process-async', ...);
app.get('/api/jobs/active', ...);           // ⬅️ ADD HERE
app.post('/api/jobs/migrate-guest', ...);   // ⬅️ ADD HERE
```

---

## 📚 Reference Documents

If you need more context:
- `BACKEND_MIGRATION_SPEC.md` - Full specification
- `supabase/FUNCTION_USAGE_EXAMPLES.md` - More code examples
- `supabase/ASYNC_JOBS_SCHEMA.md` - Database schema details

---

## ✅ Checklist

After making changes:

- [ ] Modified POST `/api/x/process-async` to accept guest_id/user_id
- [ ] Added GET `/api/jobs/active` endpoint
- [ ] Added POST `/api/jobs/migrate-guest` endpoint
- [ ] Tested: Can create job with guest_id
- [ ] Tested: Can retrieve active jobs
- [ ] Tested: Can migrate jobs
- [ ] Verified in Supabase that guest_id is saved
- [ ] Restarted backend server

**Once done, the mobile app will:**
- ✅ Create jobs that survive page reloads
- ✅ Recover jobs automatically on startup
- ✅ Migrate jobs when user logs in to Pulse Journal
- ✅ Continue processing jobs in background

---

**Need help?** Check the error logs and verify:
1. Supabase migrations are applied
2. Headers are being received (log `req.headers`)
3. Body contains guestId/userId (log `req.body`)
4. Database insert succeeds (check Supabase logs)
