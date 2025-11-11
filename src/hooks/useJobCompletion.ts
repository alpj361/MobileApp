/**
 * useJobCompletion Hook
 * Allows components to listen for job completion events
 * Automatically handles subscription/unsubscription
 */

import { useEffect } from 'react';
import {
  jobEventEmitter,
  JobEventType,
  JobCompletedEvent,
  JobFailedEvent,
  JobProgressEvent,
  JobRecoveredEvent
} from '../services/jobEventEmitter';

interface UseJobCompletionOptions {
  /**
   * URL of the job to listen for (optional)
   * If provided, only events for this URL will trigger callbacks
   */
  url?: string;

  /**
   * Callback when job completes successfully
   */
  onCompleted?: (event: JobCompletedEvent) => void;

  /**
   * Callback when job fails
   */
  onFailed?: (event: JobFailedEvent) => void;

  /**
   * Callback for job progress updates
   */
  onProgress?: (event: JobProgressEvent) => void;

  /**
   * Callback when job is recovered on page reload
   */
  onRecovered?: (event: JobRecoveredEvent) => void;
}

/**
 * Hook to listen for job events
 *
 * @example
 * ```tsx
 * useJobCompletion({
 *   url: 'https://x.com/user/status/123',
 *   onCompleted: (event) => {
 *     console.log('Job completed!', event.result);
 *     setModalLoading(false);
 *   },
 *   onFailed: (event) => {
 *     console.error('Job failed:', event.error);
 *     setModalLoading(false);
 *   }
 * });
 * ```
 */
export function useJobCompletion({
  url,
  onCompleted,
  onFailed,
  onProgress,
  onRecovered,
}: UseJobCompletionOptions) {

  useEffect(() => {
    // Create filtered event listeners
    const completedListener = (event: any) => {
      if (!url || event.url === url) {
        onCompleted?.(event as JobCompletedEvent);
      }
    };

    const failedListener = (event: any) => {
      if (!url || event.url === url) {
        onFailed?.(event as JobFailedEvent);
      }
    };

    const progressListener = (event: any) => {
      if (!url || event.url === url) {
        onProgress?.(event as JobProgressEvent);
      }
    };

    const recoveredListener = (event: any) => {
      if (!url || event.url === url) {
        onRecovered?.(event as JobRecoveredEvent);
      }
    };

    // Subscribe to events
    if (onCompleted) {
      jobEventEmitter.on('job:completed', completedListener);
    }

    if (onFailed) {
      jobEventEmitter.on('job:failed', failedListener);
    }

    if (onProgress) {
      jobEventEmitter.on('job:progress', progressListener);
    }

    if (onRecovered) {
      jobEventEmitter.on('job:recovered', recoveredListener);
    }

    // Cleanup on unmount
    return () => {
      if (onCompleted) {
        jobEventEmitter.off('job:completed', completedListener);
      }

      if (onFailed) {
        jobEventEmitter.off('job:failed', failedListener);
      }

      if (onProgress) {
        jobEventEmitter.off('job:progress', progressListener);
      }

      if (onRecovered) {
        jobEventEmitter.off('job:recovered', recoveredListener);
      }
    };
  }, [url, onCompleted, onFailed, onProgress, onRecovered]);
}
