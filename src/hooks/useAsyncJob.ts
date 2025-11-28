import { useState, useRef, useCallback } from 'react';
import { useAsyncJobContext } from '../context/AsyncJobContext';

export interface UseAsyncJobState {
  isLoading: boolean;
  progress: number;
  error: string | null;
  canCancel: boolean;
}

export interface UseAsyncJobReturn {
  state: UseAsyncJobState;
  startJob: (url: string, itemId?: string) => Promise<any>;
  cancelJob: () => void;
  reset: () => void;
}

/**
 * Simplified hook for async jobs with cancellation capability
 * Used for X/Twitter processing and other async operations
 */
export function useAsyncJob(): UseAsyncJobReturn {
  const [state, setState] = useState<UseAsyncJobState>({
    isLoading: false,
    progress: 0,
    error: null,
    canCancel: false,
  });

  const { activeJobController, setActiveJobController, cancelActiveJob } = useAsyncJobContext();
  const currentController = useRef<AbortController | null>(null);

  const startJob = useCallback(async (url: string, itemId?: string): Promise<any> => {
    try {
      // Reset state
      setState({
        isLoading: true,
        progress: 0,
        error: null,
        canCancel: true,
      });

      // Create abort controller for cancellation
      const controller = new AbortController();
      currentController.current = controller;
      setActiveJobController(controller);

      console.log(`[useAsyncJob] Starting job for URL: ${url}`);

      // Simulate async work for now - in real implementation this would call the appropriate service
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (controller.signal.aborted) {
            reject(new Error('Job was cancelled'));
            return;
          }
          resolve(true);
        }, 3000); // Simulate 3 second job

        // Handle cancellation
        controller.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Job was cancelled'));
        });

        // Simulate progress updates
        let progress = 0;
        const progressInterval = setInterval(() => {
          if (controller.signal.aborted) {
            clearInterval(progressInterval);
            return;
          }
          progress += 20;
          setState(prev => ({ ...prev, progress }));
          if (progress >= 100) {
            clearInterval(progressInterval);
          }
        }, 600);
      });

      // Job completed successfully
      setState({
        isLoading: false,
        progress: 100,
        error: null,
        canCancel: false,
      });

      console.log(`[useAsyncJob] Job completed for URL: ${url}`);
      return { success: true, url, message: 'Job completed successfully' };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      setState({
        isLoading: false,
        progress: 0,
        error: errorMessage,
        canCancel: false,
      });

      if (errorMessage.includes('cancelled')) {
        console.log(`[useAsyncJob] Job cancelled for URL: ${url}`);
      } else {
        console.error(`[useAsyncJob] Job failed for URL: ${url}`, error);
      }

      throw error;
    } finally {
      // Cleanup
      currentController.current = null;
      setActiveJobController(null);
    }
  }, [setActiveJobController]);

  const cancelJob = useCallback(() => {
    if (currentController.current) {
      console.log('[useAsyncJob] Cancelling current job');
      currentController.current.abort();
    } else {
      // Fallback to global cancellation
      cancelActiveJob();
    }
  }, [cancelActiveJob]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      progress: 0,
      error: null,
      canCancel: false,
    });
  }, []);

  return {
    state,
    startJob,
    cancelJob,
    reset,
  };
}