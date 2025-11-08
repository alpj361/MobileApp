import { useState, useRef, useCallback, useEffect } from 'react';
import { XAsyncJob, processXPostAsync, pollJobUntilComplete, checkJobStatus } from '../services/xAsyncService';
import { useAsyncJobContext } from '../context/AsyncJobContext';
import { jobPersistence, PersistedJob } from '../services/jobPersistence';

export interface UseAsyncJobState {
  isLoading: boolean;
  progress: number;
  job: XAsyncJob | null;
  error: string | null;
  canCancel: boolean;
}

export interface UseAsyncJobReturn {
  state: UseAsyncJobState;
  startJob: (url: string, itemId?: string) => Promise<any>;
  cancelJob: () => void;
  reset: () => void;
  checkForExistingJob: (url: string) => Promise<void>;
}

/**
 * Hook para manejar jobs asincrónicos con capacidad de cancelación
 * Especialmente útil para procesamiento de X/Twitter en web
 */
export function useAsyncJob(): UseAsyncJobReturn {
  const [state, setState] = useState<UseAsyncJobState>({
    isLoading: false,
    progress: 0,
    job: null,
    error: null,
    canCancel: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const jobContext = useAsyncJobContext();

  const startJob = useCallback(async (url: string, itemId?: string) => {
    console.log('[useAsyncJob] Starting job for:', url);

    // Reset state
    setState({
      isLoading: true,
      progress: 0,
      job: null,
      error: null,
      canCancel: true,
    });

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Register with job context for global cancellation
    jobContext.setActiveJobController(abortControllerRef.current);

    let jobId: string | undefined;

    try {
      // Start the job and get job ID
      const { startXProcessing } = require('../services/xAsyncService');
      jobId = await startXProcessing(url);

      // Persist the job
      const persistedJob: PersistedJob = {
        jobId,
        url,
        startTime: Date.now(),
        lastCheck: Date.now(),
        platform: 'x',
        itemId,
      };
      await jobPersistence.saveJob(persistedJob);

      // Poll for completion
      const result = await pollJobUntilComplete(
        jobId,
        (job: XAsyncJob) => {
          console.log('[useAsyncJob] Job progress:', job.progress, '%');
          setState(prev => ({
            ...prev,
            progress: job.progress,
            job,
          }));
          // Update last check time
          jobPersistence.updateJobLastCheck(jobId).catch(console.warn);
        },
        5000, // poll interval
        120,  // max attempts
        abortControllerRef.current
      );

      console.log('[useAsyncJob] Job completed successfully');

      // Remove from persistence
      await jobPersistence.removeJob(jobId);

      setState(prev => ({
        ...prev,
        isLoading: false,
        progress: 100,
        canCancel: false,
      }));

      return result;
    } catch (error: any) {
      console.error('[useAsyncJob] Job failed:', error);

      const isCancelled = error.message === 'Job cancelled by user';

      // Clean up persistence for any error
      if (jobId) {
        await jobPersistence.removeJob(jobId);
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: isCancelled ? null : error.message,
        canCancel: false,
      }));

      if (isCancelled) {
        console.log('[useAsyncJob] Job was cancelled by user');
        return null; // Return null for cancelled jobs
      }

      throw error;
    } finally {
      abortControllerRef.current = null;
      jobContext.setActiveJobController(null);
    }
  }, []);

  const cancelJob = useCallback(() => {
    console.log('[useAsyncJob] Cancelling job');

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState(prev => ({
        ...prev,
        isLoading: false,
        canCancel: false,
        error: null,
      }));
    }
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    jobContext.setActiveJobController(null);

    setState({
      isLoading: false,
      progress: 0,
      job: null,
      error: null,
      canCancel: false,
    });
  }, [jobContext]);

  const checkForExistingJob = useCallback(async (url: string) => {
    console.log('[useAsyncJob] Checking for existing job for:', url);

    const existingJob = await jobPersistence.getJobByUrl(url);
    if (!existingJob) {
      console.log('[useAsyncJob] No existing job found');
      return;
    }

    console.log('[useAsyncJob] Found existing job:', existingJob.jobId);

    // Check if job is still active
    try {
      const jobStatus = await checkJobStatus(existingJob.jobId);

      if (jobStatus.status === 'completed' && jobStatus.result) {
        console.log('[useAsyncJob] Existing job completed - cleaning up');
        await jobPersistence.removeJob(existingJob.jobId);

        setState({
          isLoading: false,
          progress: 100,
          job: jobStatus,
          error: null,
          canCancel: false,
        });

        return jobStatus.result;
      } else if (jobStatus.status === 'failed') {
        console.log('[useAsyncJob] Existing job failed - cleaning up');
        await jobPersistence.removeJob(existingJob.jobId);

        setState({
          isLoading: false,
          progress: 0,
          job: jobStatus,
          error: jobStatus.error || 'Job failed',
          canCancel: false,
        });
      } else {
        console.log('[useAsyncJob] Existing job still in progress - resuming');

        setState({
          isLoading: true,
          progress: jobStatus.progress,
          job: jobStatus,
          error: null,
          canCancel: true,
        });

        // Create new abort controller for existing job
        abortControllerRef.current = new AbortController();
        jobContext.setActiveJobController(abortControllerRef.current);

        // Resume polling
        try {
          const result = await pollJobUntilComplete(
            existingJob.jobId,
            (job: XAsyncJob) => {
              console.log('[useAsyncJob] Resumed job progress:', job.progress, '%');
              setState(prev => ({
                ...prev,
                progress: job.progress,
                job,
              }));
              jobPersistence.updateJobLastCheck(existingJob.jobId).catch(console.warn);
            },
            5000,
            120,
            abortControllerRef.current
          );

          console.log('[useAsyncJob] Resumed job completed');
          await jobPersistence.removeJob(existingJob.jobId);

          setState(prev => ({
            ...prev,
            isLoading: false,
            progress: 100,
            canCancel: false,
          }));

          return result;
        } catch (error: any) {
          console.error('[useAsyncJob] Resumed job failed:', error);
          await jobPersistence.removeJob(existingJob.jobId);

          setState(prev => ({
            ...prev,
            isLoading: false,
            error: error.message,
            canCancel: false,
          }));
        } finally {
          abortControllerRef.current = null;
          jobContext.setActiveJobController(null);
        }
      }
    } catch (error) {
      console.error('[useAsyncJob] Failed to check existing job status:', error);
      // Clean up dead job
      await jobPersistence.removeJob(existingJob.jobId);
    }
  }, [jobContext]);

  return {
    state,
    startJob,
    cancelJob,
    reset,
    checkForExistingJob,
  };
}