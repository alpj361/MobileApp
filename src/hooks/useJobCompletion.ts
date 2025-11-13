/**
 * useJobCompletion Hook
 * Allows components to listen for job completion events
 * Automatically handles subscription/unsubscription
 */

import { useEffect, useRef } from 'react';
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

  // Use refs to store latest callback values without triggering re-subscriptions
  const urlRef = useRef(url);
  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);
  const onProgressRef = useRef(onProgress);
  const onRecoveredRef = useRef(onRecovered);

  // Update refs when values change
  useEffect(() => {
    urlRef.current = url;
    onCompletedRef.current = onCompleted;
    onFailedRef.current = onFailed;
    onProgressRef.current = onProgress;
    onRecoveredRef.current = onRecovered;
  }, [url, onCompleted, onFailed, onProgress, onRecovered]);

  useEffect(() => {
    console.log('[useJobCompletion] 🔧 Subscribing to events (STABLE - will NOT re-subscribe on re-renders)');

    // Create filtered event listeners using refs (stable across re-renders)
    const completedListener = (event: any) => {
      console.log('[useJobCompletion] 📥 Received job:completed event, checking URL match...', {
        eventUrl: event.url,
        filterUrl: urlRef.current,
        matches: !urlRef.current || event.url === urlRef.current
      });

      if (!urlRef.current || event.url === urlRef.current) {
        console.log('[useJobCompletion] ✅ URL matches! Calling onCompleted callback');
        onCompletedRef.current?.(event as JobCompletedEvent);
      } else {
        console.log('[useJobCompletion] ⏭️ URL does not match, ignoring event');
      }
    };

    const failedListener = (event: any) => {
      console.log('[useJobCompletion] 📥 Received job:failed event');
      if (!urlRef.current || event.url === urlRef.current) {
        onFailedRef.current?.(event as JobFailedEvent);
      }
    };

    const progressListener = (event: any) => {
      if (!urlRef.current || event.url === urlRef.current) {
        onProgressRef.current?.(event as JobProgressEvent);
      }
    };

    const recoveredListener = (event: any) => {
      console.log('[useJobCompletion] 📥 Received job:recovered event');
      if (!urlRef.current || event.url === urlRef.current) {
        onRecoveredRef.current?.(event as JobRecoveredEvent);
      }
    };

    // Subscribe to events (only once on mount)
    if (onCompletedRef.current) {
      console.log('[useJobCompletion] ➕ Subscribing to job:completed events');
      jobEventEmitter.on('job:completed', completedListener);
    }

    if (onFailedRef.current) {
      console.log('[useJobCompletion] ➕ Subscribing to job:failed events');
      jobEventEmitter.on('job:failed', failedListener);
    }

    if (onProgressRef.current) {
      jobEventEmitter.on('job:progress', progressListener);
    }

    if (onRecoveredRef.current) {
      jobEventEmitter.on('job:recovered', recoveredListener);
    }

    // Cleanup on unmount (only)
    return () => {
      console.log('[useJobCompletion] 🔌 Unsubscribing from events (component unmounting)');
      jobEventEmitter.off('job:completed', completedListener);
      jobEventEmitter.off('job:failed', failedListener);
      jobEventEmitter.off('job:progress', progressListener);
      jobEventEmitter.off('job:recovered', recoveredListener);
    };
  }, []); // Empty dependency array - subscribe once on mount, unsubscribe on unmount
}
