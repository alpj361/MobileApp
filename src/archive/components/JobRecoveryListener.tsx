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

import { useEffect, useState, useRef } from 'react';
import { useRecoveredJobs } from '../context/AsyncJobContext';
import { pollJobUntilComplete, checkJobStatus, XCompleteData } from '../services/xAsyncService';
import { jobPersistence } from '../services/jobPersistence';
import { jobRecoveryService } from '../services/jobRecoveryService';
import { emitJobCompleted, emitJobFailed, emitJobProgress, emitJobRecovered } from '../services/jobEventEmitter';
import { useSavedStore } from '../state/savedStore';
import { saveXAnalysis, StoredXAnalysis } from '../storage/xAnalysisRepo';
import { postPersistenceService, PostWithJob } from '../services/postPersistenceService';

// ✅ Global polling registry to prevent duplicate polling
const activePollingJobs = new Set<string>();

/**
 * Extract post ID from X URL
 */
function extractPostId(url: string): string | null {
  const match = url.match(/status\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Attempt to recover a missing post from backend persistence
 * This handles cases where jobs persist but posts were lost from localStorage
 */
async function recoverMissingPost(url: string): Promise<boolean> {
  try {
    console.log('[JobRecoveryListener] 🔍 Attempting to recover missing post from backend:', url);

    // Load posts from backend
    const backendPosts = await postPersistenceService.loadPostsFromBackend();

    // Find the post by URL or post ID
    const postId = extractPostId(url);
    const foundPost = backendPosts.find(post => {
      if (post.url === url) return true;
      if (postId) {
        const itemPostId = extractPostId(post.url);
        return itemPostId === postId;
      }
      return false;
    });

    if (foundPost) {
      console.log('[JobRecoveryListener] ✅ Found missing post in backend, adding to local store');

      // Get store methods
      const { addSavedItem } = useSavedStore.getState();

      // Add the recovered post to local store
      addSavedItem(foundPost);

      return true;
    } else {
      console.log('[JobRecoveryListener] ❌ Post not found in backend either:', url);
      return false;
    }
  } catch (error) {
    console.error('[JobRecoveryListener] Error recovering missing post:', error);
    return false;
  }
}

/**
 * Save job result to AsyncStorage cache
 * This allows recovered jobs to be displayed without re-processing
 */
async function saveResultToCache(url: string, result: XCompleteData): Promise<void> {
  try {
    const postId = extractPostId(url);
    if (!postId) {
      console.warn('[JobRecoveryListener] Could not extract post ID from URL:', url);
      return;
    }

    // Transform XCompleteData to StoredXAnalysis format
    const analysis: StoredXAnalysis = {
      postId,
      type: result.media.type === 'text' ? 'text' : result.media.type === 'video' ? 'video' : 'image',
      summary: '', // Summary is generated separately by xAnalysisService
      transcript: result.transcription,
      images: result.media.images?.map(url => ({ url, description: '' })),
      text: result.media.tweet_text || result.tweet?.text || '',
      topic: '', // Topic is generated separately
      sentiment: 'neutral',
      entities: result.entities || [],
      createdAt: Date.now(),
      metadata: {
        videoSize: result.media.duration,
        imageCount: result.media.images?.length || 0,
      },
    };

    await saveXAnalysis(analysis);
    console.log('[JobRecoveryListener] 💾 Saved job result to cache for post:', postId);
  } catch (error) {
    console.error('[JobRecoveryListener] Failed to save result to cache:', error);
  }
}

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
  const prevRecoveredJobsLength = useRef(0);

  // Get store methods directly without selector (to avoid re-renders)
  const items = useSavedStore(state => state.items);
  const refreshXAnalysis = useSavedStore(state => state.refreshXAnalysis);
  const updateSavedItem = useSavedStore(state => state.updateSavedItem);

  const refreshXAnalysisByUrl = async (url: string) => {
    // Try to find item by exact URL match first
    let item = items.find(i => i.url === url);

    // If not found, try matching by post ID (URLs might have different query params)
    if (!item) {
      const postId = extractPostId(url);
      if (postId) {
        console.log('[JobRecoveryListener] 🔍 Exact URL not found, searching by post ID:', postId);
        item = items.find(i => {
          const itemPostId = extractPostId(i.url);
          return itemPostId === postId;
        });
      }
    }

    // If still not found, attempt to recover from backend
    if (!item) {
      console.log('[JobRecoveryListener] ⚠️ Could not find item with URL, attempting recovery:', url);
      const recovered = await recoverMissingPost(url);
      if (recovered) {
        // Retry finding the item after recovery
        item = items.find(i => i.url === url);
        if (!item) {
          const postId = extractPostId(url);
          if (postId) {
            item = items.find(i => {
              const itemPostId = extractPostId(i.url);
              return itemPostId === postId;
            });
          }
        }
      }
    }

    if (item) {
      console.log('[JobRecoveryListener] 🔄 Refreshing X analysis for item:', item.id);
      refreshXAnalysis(item.id);
    } else {
      console.log('[JobRecoveryListener] ❌ Could not find or recover item with URL:', url);
    }
  };

  const setItemLoadingByUrl = async (url: string) => {
    // Try to find item by exact URL match first
    let item = items.find(i => i.url === url);

    // If not found, try matching by post ID (URLs might have different query params)
    if (!item) {
      const postId = extractPostId(url);
      if (postId) {
        console.log('[JobRecoveryListener] 🔍 Exact URL not found, searching by post ID:', postId);
        item = items.find(i => {
          const itemPostId = extractPostId(i.url);
          return itemPostId === postId;
        });
      }
    }

    // If still not found, attempt to recover from backend
    if (!item) {
      console.log('[JobRecoveryListener] ⚠️ Could not find item with URL, attempting recovery:', url);
      const recovered = await recoverMissingPost(url);
      if (recovered) {
        // Retry finding the item after recovery
        item = items.find(i => i.url === url);
        if (!item) {
          const postId = extractPostId(url);
          if (postId) {
            item = items.find(i => {
              const itemPostId = extractPostId(i.url);
              return itemPostId === postId;
            });
          }
        }
      }
    }

    if (item) {
      const postId = extractPostId(url);
      if (!postId) {
        console.warn('[JobRecoveryListener] Cannot extract post ID from URL:', url);
        return;
      }

      console.log('[JobRecoveryListener] 🔄 Setting loading state for item:', item.id);
      updateSavedItem(item.id, {
        xAnalysisInfo: {
          ...(item.xAnalysisInfo || {}),
          postId,
          type: 'text',
          loading: true,
          error: null,
        } as any,
      });
    } else {
      console.log('[JobRecoveryListener] ❌ Could not find or recover item with URL:', url);
      console.log('[JobRecoveryListener] Available items:', items.map(i => ({ id: i.id, url: i.url })));
    }
  };

  // ✅ FIX Race Condition: Don't reset hasRun on initial recovery
  useEffect(() => {
    if (recoveredJobs.length !== prevRecoveredJobsLength.current) {
      console.log(`[JobRecoveryListener] 🔄 Recovered jobs changed: ${prevRecoveredJobsLength.current} → ${recoveredJobs.length}`);

      // Only reset hasRun if this is a NEW job recovery (not the initial 0→1 transition)
      // This prevents double execution when AsyncJobProvider recovers jobs after we've already processed completed ones
      if (prevRecoveredJobsLength.current > 0 && recoveredJobs.length > prevRecoveredJobsLength.current) {
        console.log(`[JobRecoveryListener] 🔄 New jobs detected, resetting hasRun`);
        setHasRun(false);
      } else {
        console.log(`[JobRecoveryListener] 🔄 Initial recovery or job completion, keeping hasRun state`);
      }

      prevRecoveredJobsLength.current = recoveredJobs.length;
    }
  }, [recoveredJobs.length]);

  useEffect(() => {
    // Wait for AsyncJobProvider to finish recovering jobs from backend
    if (isRecovering) {
      console.log('[JobRecoveryListener] ⏳ Waiting for recovery to complete...');
      return;
    }

    // Only run once after recovery completes
    if (hasRun) {
      return;
    }

    const recoverAllJobs = async () => {
      console.log('[JobRecoveryListener] 🔍 Checking for jobs to recover...');
      console.log(`[JobRecoveryListener] Recovery status: isRecovering=${isRecovering}, recoveredJobs=${recoveredJobs.length}`);

      // ✅ NEW APPROACH: Load posts with job status from backend
      // This gives us the real job status from the async_jobs table
      let postsWithJobs: PostWithJob[] = [];
      try {
        console.log('[JobRecoveryListener] 🔍 Loading posts with job status from backend...');
        postsWithJobs = await postPersistenceService.loadPostsWithJobsFromBackend();
        console.log(`[JobRecoveryListener] Found ${postsWithJobs.length} posts in backend`);

        const jobSummary = postPersistenceService.getPostsNeedingUpdate(postsWithJobs);
        console.log('[JobRecoveryListener] Job status summary:', {
          completed: jobSummary.completed.length,
          processing: jobSummary.processing.length,
          failed: jobSummary.failed.length,
        });
      } catch (error) {
        console.warn('[JobRecoveryListener] Failed to load posts with jobs, falling back to original approach:', error);
        // Fall back to original sync approach
        try {
          const { syncWithBackend } = useSavedStore.getState();
          console.log('[JobRecoveryListener] 🔄 Syncing posts with backend before job recovery...');
          await syncWithBackend();
        } catch (error) {
          console.warn('[JobRecoveryListener] Failed to sync posts with backend:', error);
        }
      }

      // Get jobs from localStorage (may include completed jobs)
      const localJobs = await jobPersistence.getActiveJobs();
      console.log(`[JobRecoveryListener] Found ${localJobs.length} job(s) in localStorage`);
      console.log(`[JobRecoveryListener] Found ${recoveredJobs.length} job(s) from backend recovery`);

      // ✅ NEW LOGIC: Process posts with job status first, then fall back to old logic
      if (postsWithJobs.length > 0) {
        console.log('[JobRecoveryListener] 🎯 Using enhanced post+job status approach');

        const updates = postPersistenceService.getPostsNeedingUpdate(postsWithJobs);
        let processedCount = 0;

        // Handle completed jobs
        for (const post of updates.completed) {
          if (post.job_id && post.job_result) {
            console.log(`[JobRecoveryListener] ✅ Found completed job ${post.job_id} for ${post.url}`);

            // Save result to cache and refresh UI
            await saveResultToCache(post.url, post.job_result);
            emitJobCompleted(post.job_id, post.url, post.job_result);

            // Clean up localStorage
            await jobPersistence.removeJob(post.job_id);

            // ✅ IMMEDIATE FIX: Clear loading state directly before triggering refresh
            const { updateSavedItem, items } = useSavedStore.getState();
            const postId = extractPostId(post.url);
            let item = items.find(i => i.url === post.url);

            if (!item && postId) {
              item = items.find(i => {
                const itemPostId = extractPostId(i.url);
                return itemPostId === postId;
              });
            }

            if (item) {
              console.log(`[JobRecoveryListener] 🎯 Directly clearing loading state for item: ${item.id}`);
              console.log(`[JobRecoveryListener] 📊 Current item state:`, JSON.stringify({
                id: item.id,
                url: item.url,
                xAnalysisInfo: item.xAnalysisInfo,
                hasLoadingState: item.xAnalysisInfo?.loading,
                platform: item.platform,
              }, null, 2));

              // ✅ POPULATE COMPLETE ANALYSIS DATA from job result
              const analysisData = {
                postId: postId || '',
                type: (post.job_result?.media?.type === 'video' ? 'video' :
                       post.job_result?.media?.type === 'image' ? 'image' : 'text') as any,
                loading: false, // ✅ CLEAR LOADING STATE
                error: null,
                // ✅ FIX: Ensure we have a summary so hasResult=true
                summary: post.job_result?.vision ||
                        post.job_result?.media?.caption ||
                        post.job_result?.media?.tweet_text ||
                        post.job_result?.tweet?.text ||
                        'Analysis completed successfully',
                transcript: post.job_result?.transcription || undefined,
                images: post.job_result?.media?.images?.map((url: string) => ({ url, description: '' })) || undefined,
                text: post.job_result?.media?.tweet_text || post.job_result?.tweet?.text || undefined,
                topic: undefined,
                sentiment: 'neutral' as any,
                entities: post.job_result?.entities || [],
                lastUpdated: Date.now(),
              };

              console.log(`[JobRecoveryListener] 🎯 Setting analysis data:`, JSON.stringify(analysisData, null, 2));

              updateSavedItem(item.id, {
                xAnalysisInfo: analysisData,
                isPending: false, // ✅ CRITICAL FIX: Clear pending state for completed jobs
              });

              // Verify the state was updated
              setTimeout(() => {
                const updatedState = useSavedStore.getState();
                const updatedItem = updatedState.items.find(i => i.id === item.id);
                console.log(`[JobRecoveryListener] ✅ After update - item state:`, JSON.stringify({
                  id: updatedItem?.id,
                  isPending: updatedItem?.isPending, // ✅ Check if pending flag is cleared
                  loading: updatedItem?.xAnalysisInfo?.loading,
                  hasResult: !!updatedItem?.xAnalysisInfo?.summary || !!updatedItem?.xAnalysisInfo?.transcript,
                  summary: updatedItem?.xAnalysisInfo?.summary,
                  transcript: updatedItem?.xAnalysisInfo?.transcript,
                  type: updatedItem?.xAnalysisInfo?.type,
                }, null, 2));
              }, 100);
            }

            // ✅ DON'T trigger refresh - the direct state update above should be sufficient
            // The refresh was causing loading state to be set again
            console.log(`[JobRecoveryListener] ⏭️  Skipping refresh for completed job - direct state update should be sufficient`);

            processedCount++;
          }
        }

        // Handle failed jobs
        for (const post of updates.failed) {
          if (post.job_id) {
            console.log(`[JobRecoveryListener] ❌ Found failed job ${post.job_id} for ${post.url}: ${post.job_error}`);

            // ✅ IMMEDIATE FIX: Clear loading state for failed jobs too
            const { updateSavedItem, items } = useSavedStore.getState();
            const postId = extractPostId(post.url);
            let item = items.find(i => i.url === post.url);

            if (!item && postId) {
              item = items.find(i => {
                const itemPostId = extractPostId(i.url);
                return itemPostId === postId;
              });
            }

            if (item) {
              console.log(`[JobRecoveryListener] 🎯 Clearing loading state for failed job item: ${item.id}`);
              updateSavedItem(item.id, {
                xAnalysisInfo: {
                  ...(item.xAnalysisInfo || {}),
                  postId: postId || '',
                  type: 'text',
                  loading: false, // ✅ CLEAR LOADING STATE
                  error: post.job_error || 'Job failed',
                } as any,
              });
            }

            emitJobFailed(post.job_id, post.url, post.job_error || 'Job failed');
            await jobPersistence.removeJob(post.job_id);
            processedCount++;
          }
        }

        // Handle processing jobs - only these need polling
        const processingJobs = updates.processing
          .filter(post => post.job_id && !activePollingJobs.has(post.job_id))
          .map(post => ({ jobId: post.job_id!, url: post.url, progress: post.job_progress || 0 }));

        console.log(`[JobRecoveryListener] 📊 Post+Job Status Results: ${updates.completed.length} completed, ${updates.failed.length} failed, ${processingJobs.length} processing`);

        if (processingJobs.length === 0) {
          console.log('[JobRecoveryListener] ✅ All jobs handled via post+job status, no polling needed');
          setHasRun(true);
          return;
        }

        // Only poll jobs that are actually processing
        console.log(`[JobRecoveryListener] 🔄 Still need to poll ${processingJobs.length} processing job(s)`);

        for (const job of processingJobs) {
          // Set loading state and start polling
          await setItemLoadingByUrl(job.url);
          registerPollingJob(job.jobId);
          emitJobRecovered(job.jobId, job.url, 'processing');

          pollJobUntilComplete(
            job.jobId,
            (updatedJob) => {
              console.log(`[JobRecoveryListener] Job ${job.jobId} progress: ${updatedJob.progress}%`);
              emitJobProgress(job.jobId, job.url, updatedJob.progress || 0, updatedJob.status || 'processing');
            },
            5000,
            120
          ).then(async (result) => {
            console.log(`[JobRecoveryListener] ✅ Job ${job.jobId} completed successfully`);
            if (result) await saveResultToCache(job.url, result);
            unregisterPollingJob(job.jobId);
            jobPersistence.removeJob(job.jobId);
            emitJobCompleted(job.jobId, job.url, result);
            setTimeout(async () => { await refreshXAnalysisByUrl(job.url); }, 500);
          }).catch((error) => {
            console.error(`[JobRecoveryListener] ❌ Failed to resume job ${job.jobId}:`, error);
            unregisterPollingJob(job.jobId);
            jobPersistence.removeJob(job.jobId);
            emitJobFailed(job.jobId, job.url, error.message || 'Failed to resume job');
          });
        }

        setHasRun(true);
        return;
      }

      // ✅ FALLBACK: Original logic for when post+job status isn't available
      console.log('[JobRecoveryListener] ⚠️ Falling back to original job recovery approach');

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

            // ✅ FIX: Save job result to AsyncStorage cache BEFORE refreshing
            // This ensures refreshXAnalysis() will find the data and not re-process
            if (status.result) {
              await saveResultToCache(job.url, status.result);
              emitJobCompleted(job.jobId, job.url, status.result);
            }

            await jobPersistence.removeJob(job.jobId);

            // Emit events to notify UI
            emitJobRecovered(job.jobId, job.url, 'completed');

            // Force refresh of the item in Zustand to load completed data
            console.log('[JobRecoveryListener] 💫 Triggering refresh for completed job');
            setTimeout(async () => {
              await refreshXAnalysisByUrl(job.url);
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

          // ✅ Set item loading state so UI shows "Analizando..." indicator
          await setItemLoadingByUrl(job.url);

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
          ).then(async (result) => {
            console.log(`[JobRecoveryListener] ✅ Job ${job.jobId} completed successfully`);

            // ✅ FIX: Save job result to AsyncStorage cache BEFORE refreshing
            if (result) {
              await saveResultToCache(job.url, result);
            }

            unregisterPollingJob(job.jobId);
            jobPersistence.removeJob(job.jobId);
            emitJobCompleted(job.jobId, job.url, result);

            // Force refresh of the item in Zustand to load completed data
            console.log('[JobRecoveryListener] 💫 Triggering refresh for resumed job that completed');
            setTimeout(async () => {
              await refreshXAnalysisByUrl(job.url);
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

    // ✅ Cleanup old completed jobs (>24h) on app start
    // This prevents accumulation of stale jobs in Supabase
    jobRecoveryService.cleanupCompletedJobs().catch(err => {
      console.warn('[JobRecoveryListener] Failed to cleanup old jobs:', err);
    });
  }, [recoveredJobs, isRecovering, hasRun]);

  // This is a background component, no UI
  return null;
}
