import { useState, useRef, useCallback, useEffect } from 'react';
import { XAsyncJob, processXPostAsync, pollJobUntilComplete, checkJobStatus } from '../services/xAsyncService';
import { useAsyncJobContext } from '../context/AsyncJobContext';
import { jobRecoveryService } from '../services/jobRecoveryService';

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

  // Helper function to resume an existing job
  const resumeJob = useCallback(async (jobId: string, url: string) => {
    console.log('[useAsyncJob] Resuming job:', jobId);

    setState({
      isLoading: true,
      progress: 0,
      job: null,
      error: null,
      canCancel: true,
    });

    // Create new abort controller for resuming
    abortControllerRef.current = new AbortController();
    jobContext.setActiveJobController(abortControllerRef.current);

    try {
      // Check current status
      const currentJob = await checkJobStatus(jobId);

      if (currentJob.status === 'completed' && currentJob.result) {
        console.log('[useAsyncJob] Job already completed');
        setState({
          isLoading: false,
          progress: 100,
          job: currentJob,
          error: null,
          canCancel: false,
        });
        return currentJob.result;
      }

      if (currentJob.status === 'failed') {
        throw new Error(currentJob.error || 'Job failed');
      }

      // Resume polling
      const result = await pollJobUntilComplete(
        jobId,
        (job: XAsyncJob) => {
          console.log('[useAsyncJob] Resumed job progress:', job.progress, '%');
          setState(prev => ({
            ...prev,
            progress: job.progress,
            job,
          }));
        },
        5000,
        120,
        abortControllerRef.current
      );

      console.log('[useAsyncJob] Resumed job completed');

      setState(prev => ({
        ...prev,
        isLoading: false,
        progress: 100,
        canCancel: false,
      }));

      return result;
    } catch (error: any) {
      console.error('[useAsyncJob] Resumed job failed:', error);

      const isCancelled = error.message === 'Job cancelled by user';

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: isCancelled ? null : error.message,
        canCancel: false,
      }));

      if (isCancelled) {
        return null;
      }

      throw error;
    } finally {
      abortControllerRef.current = null;
      jobContext.setActiveJobController(null);
    }
  }, [jobContext]);

  const startJob = useCallback(async (url: string, itemId?: string) => {
    console.log('[useAsyncJob] Starting job for:', url);

    // Check if there's already an active job for this URL
    const existingJob = await jobRecoveryService.getActiveJobForUrl(url);
    if (existingJob) {
      console.log('[useAsyncJob] Found existing job for URL, resuming:', existingJob.jobId);
      // Resume the existing job instead of creating a new one
      return await resumeJob(existingJob.jobId, url);
    }

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
      // Start the job and get job ID (now includes guest_id/user_id automatically)
      const { startXProcessing } = require('../services/xAsyncService');
      jobId = await startXProcessing(url);

      // Job is now persisted on server automatically with guest_id/user_id
      console.log('[useAsyncJob] Job persisted on server:', jobId);

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
        },
        5000, // poll interval
        120,  // max attempts
        abortControllerRef.current
      );

      console.log('[useAsyncJob] Job completed successfully');

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

    const existingJob = await jobRecoveryService.getActiveJobForUrl(url);
    if (!existingJob) {
      console.log('[useAsyncJob] No existing job found');
      return;
    }

    console.log('[useAsyncJob] Found existing job:', existingJob.jobId);

    // Resume the existing job
    try {
      const result = await resumeJob(existingJob.jobId, url);
      return result;
    } catch (error) {
      console.error('[useAsyncJob] Failed to resume existing job:', error);
      // Don't throw - just log the error
    }
  }, [resumeJob]);

  return {
    state,
    startJob,
    cancelJob,
    reset,
    checkForExistingJob,
  };
}