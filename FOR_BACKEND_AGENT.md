# 🤖 Instructions for Backend Agent (extractorw-api)

## Task
Modify the backend to support guest users with job persistence. The mobile app now sends `guest_id` or `user_id` with every job request. You need to accept these IDs and save them to Supabase.

## ⚡ Quick Context
- **Frontend repo:** MobileApp (already done ✅)
- **Backend repo:** extractorw-api (THIS IS YOU)
- **Database:** Supabase (already migrated ✅)
- **Tables created:** `guest_users`, `async_jobs` (with `guest_id` and `user_id` columns)

## 🎯 What You Need to Do

### 1️⃣ Modify POST /api/x/process-async

**Find this endpoint and change it to:**

```javascript
app.post('/api/x/process-async', async (req, res) => {
  const { url, guestId, userId } = req.body;
  const finalGuestId = guestId || req.headers['x-guest-id'];
  const finalUserId = userId || req.headers['x-user-id'];

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
    guest_id: finalGuestId || null,    // ⬅️ ADD THIS
    user_id: finalUserId || null,      // ⬅️ ADD THIS
    created_at: new Date(),
    updated_at: new Date()
  };

  const { error } = await supabase.from('async_jobs').insert(job);

  if (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }

  res.json({ success: true, jobId });
});
```

### 2️⃣ Add GET /api/jobs/active (NEW ENDPOINT)

```javascript
app.get('/api/jobs/active', async (req, res) => {
  const guestId = req.headers['x-guest-id'];
  const userId = req.headers['x-user-id'];

  // Try using Supabase function first
  const { data, error } = await supabase.rpc('get_active_jobs', {
    p_guest_id: guestId || null,
    p_user_id: userId || null
  });

  if (error) {
    // Fallback to raw query if function doesn't exist
    let query = supabase
      .from('async_jobs')
      .select('id, url, status, progress, created_at, updated_at')
      .in('status', ['queued', 'processing']);

    if (guestId) query = query.eq('guest_id', guestId);
    else if (userId) query = query.eq('user_id', userId);
    else return res.status(400).json({ success: false, error: { message: 'Header required' } });

    const { data: jobs, error: err } = await query;
    if (err) return res.status(500).json({ success: false, error: { message: err.message } });

    return res.json({
      success: true,
      jobs: jobs.map(j => ({ jobId: j.id, ...j }))
    });
  }

  res.json({
    success: true,
    jobs: data.map(job => ({
      jobId: job.job_id,
      url: job.url,
      status: job.status,
      progress: job.progress,
      createdAt: job.created_at
    }))
  });
});
```

### 3️⃣ Add POST /api/jobs/migrate-guest (NEW ENDPOINT)

```javascript
app.post('/api/jobs/migrate-guest', async (req, res) => {
  const { guestId, userId } = req.body;

  if (!guestId || !userId) {
    return res.status(400).json({
      success: false,
      error: { message: 'Both guestId and userId required' }
    });
  }

  // Try Supabase function
  const { data, error } = await supabase.rpc('migrate_guest_jobs', {
    p_guest_id: guestId,
    p_user_id: userId
  });

  if (error) {
    // Fallback to raw SQL
    const { data: jobs } = await supabase
      .from('async_jobs')
      .update({ user_id: userId, guest_id: null })
      .eq('guest_id', guestId)
      .select();

    await supabase
      .from('guest_users')
      .update({ migrated_to_user_id: userId, migrated_at: new Date() })
      .eq('guest_id', guestId);

    return res.json({
      success: true,
      migratedJobs: jobs?.length || 0,
      message: `Migrated ${jobs?.length || 0} jobs`
    });
  }

  res.json({
    success: data[0].success,
    migratedJobs: data[0].migrated_count,
    message: data[0].message
  });
});
```

## ✅ Test Commands

```bash
# Test 1: Create job
curl -X POST http://localhost:PORT/api/x/process-async \
  -H "Content-Type: application/json" \
  -H "X-Guest-Id: test-uuid-123" \
  -d '{"url": "https://x.com/test"}'

# Test 2: Get active jobs
curl -X GET http://localhost:PORT/api/jobs/active \
  -H "X-Guest-Id: test-uuid-123"

# Test 3: Migrate jobs
curl -X POST http://localhost:PORT/api/jobs/migrate-guest \
  -H "Content-Type: application/json" \
  -d '{"guestId": "test-uuid-123", "userId": "user-uuid-456"}'
```

## 🔍 Verify in Supabase

```sql
SELECT id, url, status, guest_id, user_id
FROM async_jobs
ORDER BY created_at DESC
LIMIT 5;
```

You should see `guest_id` populated for guest-created jobs.

## 📚 Full Details

If you need more context, see `BACKEND_QUICK_IMPLEMENTATION.md` in the MobileApp repo.

## ⚠️ Important

- The frontend sends `X-Guest-Id` or `X-User-Id` headers on EVERY request
- One of `guest_id` OR `user_id` must be set (database constraint enforces this)
- Supabase functions may or may not work depending on your setup, that's why there are fallbacks

## ✅ Done?

Once implemented:
1. Restart backend
2. Test with mobile app
3. Jobs should now survive page reloads ✨
