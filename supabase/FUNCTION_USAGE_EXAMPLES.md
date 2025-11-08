# Supabase Functions - Usage Examples

Ejemplos prácticos de cómo usar las funciones creadas desde tu backend (Node.js/Express).

## 🔧 Setup - Supabase Client

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for backend
);
```

## 📊 Function Examples

### 1. Get Active Jobs

**Desde SQL:**
```sql
-- Para guest
SELECT * FROM get_active_jobs(
  '123e4567-e89b-12d3-a456-426614174000'::uuid,  -- guest_id
  NULL                                             -- user_id
);

-- Para authenticated user
SELECT * FROM get_active_jobs(
  NULL,                                            -- guest_id
  '987f6543-e21c-12d3-a456-426614174999'::uuid    -- user_id
);
```

**Desde Backend (Node.js):**
```javascript
// GET /api/jobs/active
app.get('/api/jobs/active', async (req, res) => {
  const guestId = req.headers['x-guest-id'];
  const userId = req.headers['x-user-id'];

  try {
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
    console.error('Error fetching active jobs:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});
```

### 2. Get Guest Pending Jobs Count

**Desde SQL:**
```sql
SELECT get_guest_pending_jobs_count(
  '123e4567-e89b-12d3-a456-426614174000'::uuid
);
```

**Desde Backend:**
```javascript
// GET /api/jobs/guest-pending/:guestId
app.get('/api/jobs/guest-pending/:guestId', async (req, res) => {
  const { guestId } = req.params;

  try {
    const { data, error } = await supabase.rpc('get_guest_pending_jobs_count', {
      p_guest_id: guestId
    });

    if (error) throw error;

    res.json({
      success: true,
      pendingJobs: data || 0
    });
  } catch (error) {
    console.error('Error getting pending jobs:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});
```

### 3. Migrate Guest Jobs

**Desde SQL:**
```sql
SELECT * FROM migrate_guest_jobs(
  '123e4567-e89b-12d3-a456-426614174000'::uuid,  -- guest_id
  '987f6543-e21c-12d3-a456-426614174999'::uuid   -- user_id
);
```

**Desde Backend:**
```javascript
// POST /api/jobs/migrate-guest
app.post('/api/jobs/migrate-guest', async (req, res) => {
  const { guestId, userId } = req.body;

  // Validate inputs
  if (!guestId || !userId) {
    return res.status(400).json({
      success: false,
      error: { message: 'guestId and userId are required' }
    });
  }

  try {
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
    console.error('Error migrating guest jobs:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});
```

### 4. Verify Job Ownership

**Desde SQL:**
```sql
SELECT verify_job_ownership(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- job_id
  '123e4567-e89b-12d3-a456-426614174000'::uuid,  -- guest_id
  NULL                                            -- user_id
);
```

**Desde Backend (Middleware):**
```javascript
// Middleware to verify job ownership
async function verifyJobOwnership(req, res, next) {
  const { jobId } = req.params;
  const guestId = req.headers['x-guest-id'];
  const userId = req.headers['x-user-id'];

  try {
    const { data, error } = await supabase.rpc('verify_job_ownership', {
      p_job_id: jobId,
      p_guest_id: guestId || null,
      p_user_id: userId || null
    });

    if (error) throw error;

    if (!data) {
      return res.status(403).json({
        success: false,
        error: { message: 'Job not found or access denied' }
      });
    }

    next();
  } catch (error) {
    console.error('Error verifying job ownership:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
}

// Use in routes
app.get('/api/x/job-status/:jobId', verifyJobOwnership, async (req, res) => {
  // Job ownership verified, proceed with getting status
  // ...
});
```

### 5. Run Scheduled Cleanup

**Desde SQL:**
```sql
SELECT * FROM run_scheduled_cleanup();
```

**Desde Backend (Admin endpoint):**
```javascript
// POST /api/admin/cleanup
app.post('/api/admin/cleanup', authenticateAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('run_scheduled_cleanup');

    if (error) throw error;

    const result = data[0];

    res.json({
      success: result.success,
      jobsDeleted: result.jobs_deleted,
      guestsDeleted: result.guests_deleted,
      message: result.message
    });
  } catch (error) {
    console.error('Error running cleanup:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});
```

### 6. Manual Cleanup Functions

**Cleanup Old Jobs:**
```javascript
// POST /api/admin/cleanup-jobs
app.post('/api/admin/cleanup-jobs', authenticateAdmin, async (req, res) => {
  const daysOld = req.body.daysOld || 7;

  try {
    const { data, error } = await supabase.rpc('cleanup_old_jobs', {
      p_days_old: daysOld
    });

    if (error) throw error;

    const result = data[0];

    res.json({
      success: result.success,
      deletedCount: result.deleted_count,
      message: result.message
    });
  } catch (error) {
    console.error('Error cleaning up jobs:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});
```

**Cleanup Inactive Guests:**
```javascript
// POST /api/admin/cleanup-guests
app.post('/api/admin/cleanup-guests', authenticateAdmin, async (req, res) => {
  const daysInactive = req.body.daysInactive || 30;

  try {
    const { data, error } = await supabase.rpc('cleanup_inactive_guests', {
      p_days_inactive: daysInactive
    });

    if (error) throw error;

    const result = data[0];

    res.json({
      success: result.success,
      deletedCount: result.deleted_count,
      message: result.message
    });
  } catch (error) {
    console.error('Error cleaning up guests:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});
```

## 🔄 Complete Backend Integration Example

```javascript
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware to extract session identifier
app.use((req, res, next) => {
  req.session = {
    guestId: req.headers['x-guest-id'] || req.body?.guestId,
    userId: req.headers['x-user-id'] || req.body?.userId,
    type: (req.headers['x-user-id'] || req.body?.userId) ? 'authenticated' : 'guest'
  };
  next();
});

// Create async job with guest/user support
app.post('/api/x/process-async', async (req, res) => {
  const { url } = req.body;
  const { guestId, userId } = req.session;

  if (!guestId && !userId) {
    return res.status(400).json({
      success: false,
      error: { message: 'Either guest_id or user_id required' }
    });
  }

  try {
    // Create job in database
    const { data: job, error } = await supabase
      .from('async_jobs')
      .insert({
        url,
        guest_id: guestId || null,
        user_id: userId || null,
        status: 'queued',
        progress: 0
      })
      .select()
      .single();

    if (error) throw error;

    // Start processing (add to queue, etc.)
    // await jobQueue.add({ jobId: job.id, url });

    res.json({
      success: true,
      jobId: job.id
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

// Get job status with ownership verification
app.get('/api/x/job-status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const { guestId, userId } = req.session;

  try {
    // Verify ownership
    const { data: hasAccess } = await supabase.rpc('verify_job_ownership', {
      p_job_id: jobId,
      p_guest_id: guestId || null,
      p_user_id: userId || null
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: { message: 'Job not found or access denied' }
      });
    }

    // Get job status
    const { data: job, error } = await supabase
      .from('async_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

// Get active jobs for session
app.get('/api/jobs/active', async (req, res) => {
  const { guestId, userId } = req.session;

  try {
    const { data, error } = await supabase.rpc('get_active_jobs', {
      p_guest_id: guestId || null,
      p_user_id: userId || null
    });

    if (error) throw error;

    res.json({
      success: true,
      jobs: data
    });
  } catch (error) {
    console.error('Error fetching active jobs:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

// Migrate guest jobs to user
app.post('/api/jobs/migrate-guest', async (req, res) => {
  const { guestId, userId } = req.body;

  try {
    const { data, error } = await supabase.rpc('migrate_guest_jobs', {
      p_guest_id: guestId,
      p_user_id: userId
    });

    if (error) throw error;

    res.json({
      success: true,
      migratedJobs: data[0].migrated_count,
      message: data[0].message
    });
  } catch (error) {
    console.error('Error migrating jobs:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## 🧪 Testing Examples

### Using curl

```bash
# Create a job as guest
curl -X POST http://localhost:3000/api/x/process-async \
  -H "Content-Type: application/json" \
  -H "X-Guest-Id: 123e4567-e89b-12d3-a456-426614174000" \
  -d '{"url": "https://x.com/test/status/123"}'

# Get active jobs
curl -X GET http://localhost:3000/api/jobs/active \
  -H "X-Guest-Id: 123e4567-e89b-12d3-a456-426614174000"

# Migrate guest to user
curl -X POST http://localhost:3000/api/jobs/migrate-guest \
  -H "Content-Type: application/json" \
  -d '{
    "guestId": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "987f6543-e21c-12d3-a456-426614174999"
  }'
```

### Using Postman/Thunder Client

**Collection: Guest User Jobs**

1. **Create Job (Guest)**
   - Method: POST
   - URL: `{{baseUrl}}/api/x/process-async`
   - Headers: `X-Guest-Id: {{guestId}}`
   - Body: `{"url": "https://x.com/test"}`

2. **Get Active Jobs**
   - Method: GET
   - URL: `{{baseUrl}}/api/jobs/active`
   - Headers: `X-Guest-Id: {{guestId}}`

3. **Migrate to User**
   - Method: POST
   - URL: `{{baseUrl}}/api/jobs/migrate-guest`
   - Body: `{"guestId": "{{guestId}}", "userId": "{{userId}}"}`

## 📝 Notes

- All functions use `SECURITY DEFINER` to run with elevated permissions
- RLS policies are still enforced for direct table access
- Use service key in backend, not anon key
- Always validate guest_id/user_id before calling functions
- Handle errors gracefully with proper HTTP status codes
