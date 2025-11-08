Backend Patch: Guest Device Jobs (Async)

Problem
- 500 error on POST /api/x/process-async: insert/update on table "async_jobs" violates FK "async_jobs_guest_id_fkey".
- Cause: backend inserts async_jobs.guest_id with a device UUID that doesn’t exist in public.guest_users.

Solution
- Upsert guest into public.guest_users before inserting the async job.
- Verify ownership on status/cancel endpoints.

Files Added
- backend-snippets/extractorw/x-async-routes.js
  - Express router registering:
    - POST /api/x/process-async → upsert guest, then insert job
    - GET  /api/x/job-status/:jobId → verify ownership via RPC, return job
    - POST /api/x/cancel-job/:jobId → verify ownership, mark cancelled
    - GET  /api/jobs/active → list active jobs for current session

Requirements
- Env vars on server:
  - SUPABASE_URL
  - SUPABASE_SERVICE_KEY (service role)
- Supabase schema applied (no changes beyond docs in this repo):
  - 001_create_guest_users_table.sql
  - 000_create_async_jobs_table.sql
  - 003_create_guest_job_functions.sql (verify_job_ownership, get_active_jobs, etc.)

How To Integrate
1) Copy file to your ExtractorW server and register routes:

```js
// server/index.js (example)
import express from 'express';
import { registerXAsyncRoutes } from './routes/x-async-routes.js';

const app = express();
// ... any existing middleware

registerXAsyncRoutes(app);

app.listen(process.env.PORT || 3000);
```

2) Ensure schema is applied in Supabase:
   - guest_users table exists and is accessible with service key
   - async_jobs has guest_id FK → guest_users(guest_id)
   - functions from 003_create_guest_job_functions.sql exist

3) Test
```bash
# Create a job (guest)
curl -X POST "$BASE/api/x/process-async" \
  -H 'Content-Type: application/json' \
  -H "X-Guest-Id: $GUEST" \
  -d '{"url":"https://x.com/test/status/123"}'

# Get active jobs for the guest
curl -X GET "$BASE/api/jobs/active" -H "X-Guest-Id: $GUEST"

# Check job status
curl -X GET "$BASE/api/x/job-status/$JOB" -H "X-Guest-Id: $GUEST"

# Cancel job
curl -X POST "$BASE/api/x/cancel-job/$JOB" -H "X-Guest-Id: $GUEST"
```

Notes
- Frontend in this repo already sends X-Guest-Id headers and guestId in the body.
- No client changes required once backend upserts guest_users before job insert.
- If you later add a worker/queue, enqueue right after the insert.

