/**
 * Job Recovery Listener
 * Automatically resumes recovered jobs when app reloads
 *
 * Strategy:
 * 1. Check localStorage for jobs (includes completed jobs)
 * 2. Check backend for active jobs (only queued/processing)
 * 3. Merge both sources
 * 4. Resume all jobs that aren't completed yet
 */

import { useEffect, useState } from 'react';
import { useRecoveredJobs } from '../context/AsyncJobContext';
import { pollJobUntilComplete, checkJobStatus } from '../services/xAsyncService';
import { jobPersistence } from '../services/jobPersistence';
import { emitJobCompleted, emitJobFailed, emitJobProgress, emitJobRecovered } from '../services/jobEventEmitter';
import { useSavedStore } from '../state/savedStore';

// ✅ Global polling registry to prevent duplicate polling
const activePollingJobs = new Set<string>();

export function isJobBeingPolled(jobId: string): boolean {
  return activePollingJobs.has(jobId);
}

export function registerPollingJob(jobId: string): void {
  activePollingJobs.add(jobId);
  console.log('[JobRecoveryListener] 📝 Registered polling for job:', jobId);
}

export function unregisterPollingJob(jobId: string): void {
  activePollingJobs.delete(jobId);
  console.log('[JobRecoveryListener] 🗑️ Unregistered polling for job:', jobId);
}

export function JobRecoveryListener() {
  const { recoveredJobs, isRecovering } = useRecoveredJobs();
  const [hasRun, setHasRun] = useState(false);

  // Get store methods directly without selector (to avoid re-renders)
  const items = useSavedStore(state => state.items);
  const refreshXAnalysis = useSavedStore(state => state.refreshXAnalysis);

  const refreshXAnalysisByUrl = (url: string) => {
    const item = items.find(i => i.url === url);
    if (item) {
      console.log('[JobRecoveryListener] 🔄 Refreshing X analysis for item:', item.id);
      refreshXAnalysis(item.id);
    } else {
      console.log('[JobRecoveryListener] ⚠️ Could not find item with URL:', url);
    }
  };

  useEffect(() => {
    if (isRecovering || hasRun) {
      return;
    }

    const recoverAllJobs = async () => {
      console.log('[JobRecoveryListener] 🔍 Checking for jobs to recover...');

      // Get jobs from localStorage (may include completed jobs)
      const localJobs = await jobPersistence.getActiveJobs();
      console.log(`[JobRecoveryListener] Found ${localJobs.length} job(s) in localStorage`);
      console.log(`[JobRecoveryListener] Found ${recoveredJobs.length} job(s) from backend`);

      // Merge local and backend jobs (deduplicate by jobId)
      const allJobIds = new Set<string>();
      const jobsToCheck: Array<{ jobId: string; url: string }> = [];

      // Add backend jobs first (they're definitely active)
      recoveredJobs.forEach(job => {
        if (!allJobIds.has(job.jobId)) {
          allJobIds.add(job.jobId);
          jobsToCheck.push({ jobId: job.jobId, url: job.url });
        }
      });

      // Add local jobs that aren't in backend
      localJobs.forEach(job => {
        if (!allJobIds.has(job.jobId)) {
          allJobIds.add(job.jobId);
          jobsToCheck.push({ jobId: job.jobId, url: job.url });
        }
      });

      if (jobsToCheck.length === 0) {
        console.log('[JobRecoveryListener] No jobs to recover');
        setHasRun(true);
        return;
      }

      console.log(`[JobRecoveryListener] Total unique jobs to check: ${jobsToCheck.length}`);

      // Show notification about job recovery
      let jobsToResume = 0;

      // Check status of each job and resume if needed
      for (const job of jobsToCheck) {
        try {
          console.log(`[JobRecoveryListener] Checking status of job ${job.jobId}...`);

          const status = await checkJobStatus(job.jobId);

          if (status.status === 'completed') {
            console.log(`[JobRecoveryListener] ✅ Job ${job.jobId} already completed - removing from localStorage`);
            await jobPersistence.removeJob(job.jobId);

            // Emit events to notify UI
            emitJobRecovered(job.jobId, job.url, 'completed');
            if (status.result) {
              emitJobCompleted(job.jobId, job.url, status.result);
            }

            // Force refresh of the item in Zustand to load completed data
            console.log('[JobRecoveryListener] 💫 Triggering refresh for completed job');
            setTimeout(() => {
              refreshXAnalysisByUrl(job.url);
            }, 500);

            continue;
          }

          if (status.status === 'failed') {
            console.log(`[JobRecoveryListener] ❌ Job ${job.jobId} failed - removing from localStorage`);
            await jobPersistence.removeJob(job.jobId);

            // Emit failure event
            emitJobRecovered(job.jobId, job.url, 'failed');
            emitJobFailed(job.jobId, job.url, status.error || 'Unknown error');
            continue;
          }

          // Job is still processing, resume polling
          jobsToResume++;
          console.log(`[JobRecoveryListener] 🔄 Resuming job ${job.jobId} (${status.status} ${status.progress}%)`);

          // ✅ Register this job as being polled to prevent duplicates
          registerPollingJob(job.jobId);

          // Emit recovery event
          emitJobRecovered(job.jobId, job.url, 'processing');

          pollJobUntilComplete(
            job.jobId,
            (updatedJob) => {
              console.log(`[JobRecoveryListener] Job ${job.jobId} progress: ${updatedJob.progress}%`);
              emitJobProgress(job.jobId, job.url, updatedJob.progress || 0, updatedJob.status || 'processing');
            },
            5000,
            120
          ).then((result) => {
            console.log(`[JobRecoveryListener] ✅ Job ${job.jobId} completed successfully`);
            unregisterPollingJob(job.jobId);
            jobPersistence.removeJob(job.jobId);
            emitJobCompleted(job.jobId, job.url, result);

            // Force refresh of the item in Zustand to load completed data
            console.log('[JobRecoveryListener] 💫 Triggering refresh for resumed job that completed');
            setTimeout(() => {
              refreshXAnalysisByUrl(job.url);
            }, 500);
          }).catch((error) => {
            console.error(`[JobRecoveryListener] ❌ Failed to resume job ${job.jobId}:`, error);
            unregisterPollingJob(job.jobId);
            jobPersistence.removeJob(job.jobId);
            emitJobFailed(job.jobId, job.url, error.message || 'Failed to resume job');
          });

        } catch (error) {
          console.error(`[JobRecoveryListener] Error checking job ${job.jobId}:`, error);
          // Don't remove from localStorage yet, might be network error
        }
      }

      // Log summary if we're resuming any jobs
      if (jobsToResume > 0) {
        const message = jobsToResume === 1
          ? 'Resuming 1 background job...'
          : `Resuming ${jobsToResume} background jobs...`;
        console.log(`[JobRecoveryListener] 🔄 ${message}`);
      }

      setHasRun(true);
    };

    recoverAllJobs();
  }, [recoveredJobs, isRecovering, hasRun]);

  // This is a background component, no UI
  return null;
}
