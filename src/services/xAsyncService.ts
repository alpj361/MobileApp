/**
 * X Async Service
 * Handles asynchronous X post processing with job queue
 */

import { getApiUrl } from '../config/backend';
import { ExtractedEntity } from '../types/entities';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface XAsyncJob {
  jobId: string;
  status: JobStatus;
  progress: number;
  result?: XCompleteData;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface XCompleteData {
  media: {
    post_id: string;
    type: 'text' | 'image' | 'video' | 'gif' | 'carousel';
    video_url?: string;
    audio_url?: string;
    images?: string[];
    thumbnail_url?: string;
    duration?: number;
    caption?: string;
    tweet_text?: string;
    tweet_metrics?: {
      likes?: number;
      retweets?: number;
      replies?: number;
      views?: number;
    };
    author_handle?: string;
    author_name?: string;
    comments?: any[];
    comments_count?: number;
  };
  transcription?: string;
  vision?: string;
  comments: any[];
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    views: number;
  };
  tweet: {
    text: string;
    author_handle: string;
    author_name: string;
  };
  entities?: ExtractedEntity[];  // ✅ Extracted entities from all sources
}

/**
 * Start async X post processing
 * Returns job ID immediately, processing happens in background
 */
export async function startXProcessing(url: string): Promise<string> {
  console.log('[X Async] Starting async processing for:', url);

  const apiUrl = getApiUrl('/api/x/process-async', 'extractorw');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || 'Failed to start processing');
  }

  const data = await response.json();

  if (!data.success || !data.jobId) {
    throw new Error('Invalid response from server');
  }

  console.log('[X Async] Job created:', data.jobId);
  return data.jobId;
}

/**
 * Check job status
 * Returns current job state and result if completed
 */
export async function checkJobStatus(jobId: string): Promise<XAsyncJob> {
  const apiUrl = getApiUrl(`/api/x/job-status/${jobId}`, 'extractorw');

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || 'Failed to check job status');
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to check job status');
  }

  return {
    jobId: data.jobId,
    status: data.status,
    progress: data.progress,
    result: data.result,
    error: data.error,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Poll job status until completion
 * Calls onProgress callback with status updates
 * Returns final result when completed
 */
export async function pollJobUntilComplete(
  jobId: string,
  onProgress?: (job: XAsyncJob) => void,
  pollIntervalMs: number = 5000,
  maxAttempts: number = 120, // 10 minutes max (5s * 120)
): Promise<XCompleteData> {
  console.log('[X Async] Starting polling for job:', jobId);

  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    try {
      const job = await checkJobStatus(jobId);

      // Call progress callback
      if (onProgress) {
        onProgress(job);
      }

      console.log(`[X Async] Job ${jobId} status:`, job.status, `(${job.progress}%)`);

      // Job completed successfully
      if (job.status === 'completed' && job.result) {
        console.log('[X Async] Job completed successfully');
        return job.result;
      }

      // Job failed
      if (job.status === 'failed') {
        throw new Error(job.error || 'Job failed');
      }

      // Still processing, wait and poll again
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    } catch (error) {
      console.error('[X Async] Polling error:', error);
      // If it's a network error, retry
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        continue;
      }
      throw error;
    }
  }

  throw new Error('Job polling timeout - processing took too long');
}

/**
 * Convenience function: Start processing and wait for result
 * This combines startXProcessing and pollJobUntilComplete
 */
export async function processXPostAsync(
  url: string,
  onProgress?: (job: XAsyncJob) => void,
): Promise<XCompleteData> {
  const jobId = await startXProcessing(url);
  return await pollJobUntilComplete(jobId, onProgress);
}
