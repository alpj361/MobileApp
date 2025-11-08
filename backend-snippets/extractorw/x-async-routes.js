// ExtractorW async job routes with guest support
// Drop-in snippet for your Express server
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_KEY

import express from 'express';
import { createClient } from '@supabase/supabase-js';

export function registerXAsyncRoutes(app) {
  const router = express.Router();
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );

  // Ensure JSON body parsing
  app.use(express.json());

  // Simple session extractor from headers/body
  app.use((req, _res, next) => {
    req.session = {
      guestId: req.headers['x-guest-id'] || req.body?.guestId || null,
      userId: req.headers['x-user-id'] || req.body?.userId || null,
    };
    next();
  });

  // Helper: ensure guest exists to satisfy FK
  async function ensureGuestExists(guestId, userAgent) {
    if (!guestId) return;

    const deviceInfo = userAgent ? { userAgent } : null;
    const { error } = await supabase
      .from('guest_users')
      .upsert(
        {
          guest_id: guestId,
          device_platform: 'web',
          device_info: deviceInfo,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: 'guest_id' }
      );

    if (error) throw error;
  }

  // POST /api/x/process-async — create job
  router.post('/process-async', async (req, res) => {
    const { url } = req.body || {};
    const { guestId, userId } = req.session || {};

    if (!url) return res.status(400).json({ success: false, error: { message: 'url is required' } });
    if (!guestId && !userId) {
      return res.status(400).json({ success: false, error: { message: 'Either guest_id or user_id required' } });
    }

    try {
      // 1) Upsert guest to satisfy FK if needed
      if (guestId) {
        await ensureGuestExists(guestId, req.headers['user-agent']);
      }

      // 2) Insert job
      const { data: job, error: insertErr } = await supabase
        .from('async_jobs')
        .insert({
          url,
          guest_id: guestId || null,
          user_id: userId || null,
          status: 'queued',
          progress: 0,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // TODO: enqueue processing with your queue/worker

      return res.json({ success: true, jobId: job.id });
    } catch (e) {
      console.error('[x/process-async] Error:', e);
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  });

  // GET /api/x/job-status/:jobId — verify ownership, return status
  router.get('/job-status/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const { guestId, userId } = req.session || {};

    try {
      // Verify ownership via RPC (see migrations/003_create_guest_job_functions.sql)
      const { data: hasAccess, error: ownErr } = await supabase.rpc('verify_job_ownership', {
        p_job_id: jobId,
        p_guest_id: guestId || null,
        p_user_id: userId || null,
      });
      if (ownErr) throw ownErr;
      if (!hasAccess) {
        return res.status(403).json({ success: false, error: { message: 'Job not found or access denied' } });
      }

      const { data: job, error } = await supabase
        .from('async_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      if (error) throw error;

      return res.json({
        success: true,
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        result: job.result,
        error: job.error,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      });
    } catch (e) {
      console.error('[x/job-status] Error:', e);
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  });

  // POST /api/x/cancel-job/:jobId — verify ownership, best-effort cancel
  router.post('/cancel-job/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const { guestId, userId } = req.session || {};

    try {
      const { data: hasAccess, error: ownErr } = await supabase.rpc('verify_job_ownership', {
        p_job_id: jobId,
        p_guest_id: guestId || null,
        p_user_id: userId || null,
      });
      if (ownErr) throw ownErr;
      if (!hasAccess) {
        return res.status(403).json({ success: false, error: { message: 'Job not found or access denied' } });
      }

      // Mark as cancelled (optional: signal your worker)
      const { error } = await supabase
        .from('async_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId);
      if (error) throw error;

      return res.json({ success: true });
    } catch (e) {
      console.warn('[x/cancel-job] Error:', e);
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  });

  // GET /api/jobs/active — list active jobs for session
  app.get('/api/jobs/active', async (req, res) => {
    const { guestId, userId } = req.session || {};
    try {
      const { data, error } = await supabase.rpc('get_active_jobs', {
        p_guest_id: guestId || null,
        p_user_id: userId || null,
      });
      if (error) throw error;
      return res.json({ success: true, jobs: data || [] });
    } catch (e) {
      console.error('[jobs/active] Error:', e);
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  });

  // Mount X routes under /api/x
  app.use('/api/x', router);
}
