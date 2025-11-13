/**
 * Job Event Emitter
 * Notifies UI components when jobs complete, fail, or update
 *
 * Usage:
 * ```typescript
 * // Listen to job completion
 * jobEventEmitter.on('job:completed', (data) => {
 *   console.log('Job completed:', data.jobId, data.result);
 * });
 *
 * // Emit job completion
 * jobEventEmitter.emit('job:completed', { jobId: '123', result: {...} });
 * ```
 */

export type JobEventType =
  | 'job:completed'  // Job finished successfully
  | 'job:failed'     // Job failed
  | 'job:progress'   // Job progress updated
  | 'job:cancelled'  // Job was cancelled
  | 'job:recovered'; // Job was recovered from storage

export interface JobCompletedEvent {
  jobId: string;
  url: string;
  result: any;
  timestamp: number;
}

export interface JobFailedEvent {
  jobId: string;
  url: string;
  error: string;
  timestamp: number;
}

export interface JobProgressEvent {
  jobId: string;
  url: string;
  progress: number;
  status: string;
  timestamp: number;
}

export interface JobCancelledEvent {
  jobId: string;
  url: string;
  timestamp: number;
}

export interface JobRecoveredEvent {
  jobId: string;
  url: string;
  status: 'completed' | 'processing' | 'failed';
  timestamp: number;
}

export type JobEventData =
  | JobCompletedEvent
  | JobFailedEvent
  | JobProgressEvent
  | JobCancelledEvent
  | JobRecoveredEvent;

type EventListener = (data: JobEventData) => void;

class JobEventEmitter {
  private listeners: Map<JobEventType, Set<EventListener>> = new Map();

  /**
   * Subscribe to a job event
   */
  on(eventType: JobEventType, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
    console.log(`[JobEventEmitter] Listener added for: ${eventType}`);
  }

  /**
   * Unsubscribe from a job event
   */
  off(eventType: JobEventType, listener: EventListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      console.log(`[JobEventEmitter] Listener removed for: ${eventType}`);
    }
  }

  /**
   * Emit a job event to all subscribers
   */
  emit(eventType: JobEventType, data: JobEventData): void {
    const listeners = this.listeners.get(eventType);
    if (listeners && listeners.size > 0) {
      console.log(`[JobEventEmitter] Emitting ${eventType} to ${listeners.size} listener(s)`);
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[JobEventEmitter] Error in listener for ${eventType}:`, error);
        }
      });
    } else {
      console.log(`[JobEventEmitter] No listeners for: ${eventType}`);
    }
  }

  /**
   * Remove all listeners for a specific event type
   */
  removeAllListeners(eventType?: JobEventType): void {
    if (eventType) {
      this.listeners.delete(eventType);
      console.log(`[JobEventEmitter] All listeners removed for: ${eventType}`);
    } else {
      this.listeners.clear();
      console.log(`[JobEventEmitter] All listeners removed`);
    }
  }

  /**
   * Get count of active listeners
   */
  getListenerCount(eventType: JobEventType): number {
    return this.listeners.get(eventType)?.size || 0;
  }
}

// Singleton instance
export const jobEventEmitter = new JobEventEmitter();

/**
 * Helper to emit job completion
 * ✅ Ensures complete data is included in the event
 */
export function emitJobCompleted(jobId: string, url: string, result: any): void {
  console.log('[JobEventEmitter] Emitting job:completed with complete result data');
  console.log('[JobEventEmitter] Result keys:', result ? Object.keys(result) : 'null');
  
  jobEventEmitter.emit('job:completed', {
    jobId,
    url,
    result, // ✅ Complete result object with all data (transcription, vision, entities, etc.)
    timestamp: Date.now(),
  });
}

/**
 * Helper to emit job failure
 */
export function emitJobFailed(jobId: string, url: string, error: string): void {
  jobEventEmitter.emit('job:failed', {
    jobId,
    url,
    error,
    timestamp: Date.now(),
  });
}

/**
 * Helper to emit job progress
 */
export function emitJobProgress(jobId: string, url: string, progress: number, status: string): void {
  jobEventEmitter.emit('job:progress', {
    jobId,
    url,
    progress,
    status,
    timestamp: Date.now(),
  });
}

/**
 * Helper to emit job recovery
 */
export function emitJobRecovered(jobId: string, url: string, status: 'completed' | 'processing' | 'failed'): void {
  jobEventEmitter.emit('job:recovered', {
    jobId,
    url,
    status,
    timestamp: Date.now(),
  });
}

/**
 * Helper to emit job cancellation
 */
export function emitJobCancelled(jobId: string, url: string): void {
  jobEventEmitter.emit('job:cancelled', {
    jobId,
    url,
    timestamp: Date.now(),
  });
}
