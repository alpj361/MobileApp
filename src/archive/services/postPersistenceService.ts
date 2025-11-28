/**
 * Post Persistence Service
 * Handles hybrid persistence for guest posts (localStorage + Supabase backend)
 * Ensures posts survive app reloads for both guest and authenticated users
 */

import { SavedItem } from '../state/savedStore';
import { guestSessionManager } from './guestSessionManager';
import { getApiUrl } from '../config/backend';

export interface PostWithJob {
  id: string;
  url: string;
  item_data: SavedItem;
  job_id: string | null;
  created_at: string;
  updated_at: string;
  job_status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | null;
  job_progress: number | null;
  job_result: any | null;
  job_error: string | null;
  job_created_at: string | null;
  job_updated_at: string | null;
}

export interface PersistenceStats {
  localCount: number;
  backendCount: number;
  syncStatus: 'synced' | 'out_of_sync' | 'error';
  lastSync: Date | null;
  jobStats: {
    completed: number;
    processing: number;
    failed: number;
    queued: number;
  };
}

export interface PersistenceResult {
  success: boolean;
  error?: string;
  syncedCount?: number;
}

class PostPersistenceService {
  private syncInProgress = false;
  private lastSyncTime: Date | null = null;

  /**
   * Save posts to backend (Supabase)
   * This is the primary persistence mechanism
   */
  async savePostsToBackend(items: SavedItem[]): Promise<PersistenceResult> {
    try {
      const headers = await guestSessionManager.getApiHeaders();
      const apiUrl = getApiUrl('/api/guest-posts', 'extractorw');

      console.log(`[PostPersistence] Saving ${items.length} posts to backend...`);

      let syncedCount = 0;
      const errors: string[] = [];

      // Save each post individually to handle conflicts gracefully
      for (const item of items) {
        try {
          const postData = {
            url: item.url,
            itemData: item,
            jobId: null, // Will be populated when jobs complete
          };

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(postData),
          });

          if (response.ok) {
            syncedCount++;
          } else {
            const errorData = await response.json();

            // 409 is expected for duplicates - not really an error
            if (response.status !== 409) {
              errors.push(`${item.url}: ${errorData.error?.message || 'Unknown error'}`);
            } else {
              syncedCount++; // Count duplicates as "synced"
            }
          }
        } catch (error) {
          errors.push(`${item.url}: ${error instanceof Error ? error.message : 'Network error'}`);
        }
      }

      if (errors.length > 0 && syncedCount === 0) {
        console.error('[PostPersistence] All posts failed to sync:', errors);
        return {
          success: false,
          error: `Failed to sync posts: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`,
        };
      }

      console.log(`[PostPersistence] ✅ Synced ${syncedCount}/${items.length} posts to backend`);
      this.lastSyncTime = new Date();

      return {
        success: true,
        syncedCount,
      };
    } catch (error) {
      console.error('[PostPersistence] Error saving to backend:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Load posts with job information from backend
   * This includes job status, progress, and results
   */
  async loadPostsWithJobsFromBackend(): Promise<PostWithJob[]> {
    try {
      const headers = await guestSessionManager.getApiHeaders();
      const apiUrl = getApiUrl('/api/guest-posts/with-jobs', 'extractorw');

      console.log('[PostPersistence] Loading posts with job information from backend...');

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to load posts with jobs');
      }

      const data = await response.json();
      const postsWithJobs: PostWithJob[] = data.posts || [];

      console.log(`[PostPersistence] ✅ Loaded ${postsWithJobs.length} posts with job info from backend`);
      console.log('[PostPersistence] Job statuses:', this.summarizeJobStatuses(postsWithJobs));
      this.lastSyncTime = new Date();

      return postsWithJobs;
    } catch (error) {
      console.error('[PostPersistence] Error loading posts with jobs from backend:', error);
      // Return empty array on error - localStorage will be used as fallback
      return [];
    }
  }

  /**
   * Load posts from backend (legacy method for compatibility)
   * This is the source of truth for persistence across app reloads
   */
  async loadPostsFromBackend(): Promise<SavedItem[]> {
    try {
      const headers = await guestSessionManager.getApiHeaders();
      const apiUrl = getApiUrl('/api/guest-posts', 'extractorw');

      console.log('[PostPersistence] Loading posts from backend...');

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to load posts');
      }

      const data = await response.json();
      const backendPosts: SavedItem[] = data.posts?.map((post: any) => post.item_data) || [];

      console.log(`[PostPersistence] ✅ Loaded ${backendPosts.length} posts from backend`);
      this.lastSyncTime = new Date();

      return backendPosts;
    } catch (error) {
      console.error('[PostPersistence] Error loading from backend:', error);
      // Return empty array on error - localStorage will be used as fallback
      return [];
    }
  }

  /**
   * Save a single post to backend
   * Used when posts are added individually
   */
  async saveSinglePost(item: SavedItem): Promise<boolean> {
    const result = await this.savePostsToBackend([item]);
    return result.success;
  }

  /**
   * Update a post's job association in backend
   * Called when jobs complete to link results with posts
   */
  async updatePostJobId(url: string, jobId: string): Promise<boolean> {
    try {
      const headers = await guestSessionManager.getApiHeaders();
      const backendPosts = await this.loadPostsFromBackend();

      // Find the post by URL
      const post = backendPosts.find(p => p.url === url);
      if (!post) {
        console.warn(`[PostPersistence] Post not found for URL: ${url}`);
        return false;
      }

      // Update via backend API
      const apiUrl = getApiUrl('/api/guest-posts', 'extractorw');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url,
          itemData: post,
          jobId,
        }),
      });

      if (response.ok) {
        console.log(`[PostPersistence] ✅ Updated job ID for post: ${url} → ${jobId}`);
        return true;
      }

      const errorData = await response.json();
      console.error(`[PostPersistence] Failed to update job ID:`, errorData.error?.message);
      return false;
    } catch (error) {
      console.error('[PostPersistence] Error updating job ID:', error);
      return false;
    }
  }

  /**
   * Remove posts from backend
   * Used when posts are deleted
   */
  async removePostsFromBackend(urls: string[]): Promise<boolean> {
    try {
      const headers = await guestSessionManager.getApiHeaders();
      const apiUrl = getApiUrl('/api/guest-posts', 'extractorw');

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ urls }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[PostPersistence] ✅ Removed ${data.deletedCount} posts from backend`);
        return true;
      }

      const errorData = await response.json();
      console.error('[PostPersistence] Failed to remove posts:', errorData.error?.message);
      return false;
    } catch (error) {
      console.error('[PostPersistence] Error removing posts:', error);
      return false;
    }
  }

  /**
   * Sync localStorage with backend
   * Merges data and resolves conflicts
   */
  async syncWithBackend(localPosts: SavedItem[]): Promise<SavedItem[]> {
    if (this.syncInProgress) {
      console.log('[PostPersistence] Sync already in progress, skipping...');
      return localPosts;
    }

    this.syncInProgress = true;

    try {
      console.log('[PostPersistence] 🔄 Starting sync...');

      // Load posts from backend
      const backendPosts = await this.loadPostsFromBackend();

      if (backendPosts.length === 0 && localPosts.length > 0) {
        // Backend is empty, upload local posts
        console.log('[PostPersistence] Backend empty, uploading local posts...');
        await this.savePostsToBackend(localPosts);
        return localPosts;
      }

      if (localPosts.length === 0) {
        // Local is empty, use backend posts
        console.log('[PostPersistence] Local empty, using backend posts...');
        return backendPosts;
      }

      // Merge posts - backend takes precedence for conflicts
      const mergedPosts = this.mergePosts(localPosts, backendPosts);

      // Save any local-only posts to backend
      const localOnlyPosts = localPosts.filter(
        local => !backendPosts.some(backend => backend.url === local.url)
      );

      if (localOnlyPosts.length > 0) {
        console.log(`[PostPersistence] Uploading ${localOnlyPosts.length} local-only posts...`);
        await this.savePostsToBackend(localOnlyPosts);
      }

      console.log(`[PostPersistence] ✅ Sync complete: ${mergedPosts.length} total posts`);
      return mergedPosts;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Summarize job statuses for logging
   */
  private summarizeJobStatuses(postsWithJobs: PostWithJob[]): Record<string, number> {
    const summary: Record<string, number> = {
      completed: 0,
      processing: 0,
      failed: 0,
      queued: 0,
      no_job: 0,
    };

    postsWithJobs.forEach(post => {
      if (!post.job_status) {
        summary.no_job++;
      } else {
        summary[post.job_status] = (summary[post.job_status] || 0) + 1;
      }
    });

    return summary;
  }

  /**
   * Check if a post has a completed job
   */
  isPostJobCompleted(post: PostWithJob): boolean {
    return post.job_status === 'completed' && post.job_progress === 100;
  }

  /**
   * Check if a post has a processing job
   */
  isPostJobProcessing(post: PostWithJob): boolean {
    return post.job_status === 'processing' || post.job_status === 'queued';
  }

  /**
   * Get posts that need UI updates based on job status
   */
  getPostsNeedingUpdate(postsWithJobs: PostWithJob[]): {
    completed: PostWithJob[];
    processing: PostWithJob[];
    failed: PostWithJob[];
  } {
    return {
      completed: postsWithJobs.filter(post => this.isPostJobCompleted(post)),
      processing: postsWithJobs.filter(post => this.isPostJobProcessing(post)),
      failed: postsWithJobs.filter(post => post.job_status === 'failed'),
    };
  }

  /**
   * Merge local and backend posts with conflict resolution
   * Backend takes precedence for conflicts (newer data)
   */
  private mergePosts(localPosts: SavedItem[], backendPosts: SavedItem[]): SavedItem[] {
    const merged = new Map<string, SavedItem>();

    // Add local posts first
    localPosts.forEach(post => {
      merged.set(post.url, post);
    });

    // Backend posts override local (they're considered more authoritative)
    backendPosts.forEach(post => {
      const existing = merged.get(post.url);
      if (!existing) {
        merged.set(post.url, post);
      } else {
        // Merge metadata - keep the most complete version
        const mergedPost: SavedItem = {
          ...existing,
          ...post,
          // Preserve analysis/comment data from local if backend doesn't have it
          analysisInfo: post.analysisInfo || existing.analysisInfo,
          xAnalysisInfo: post.xAnalysisInfo || existing.xAnalysisInfo,
          commentsInfo: post.commentsInfo || existing.commentsInfo,
          // Use the latest timestamp
          lastUpdated: Math.max(
            existing.lastUpdated || 0,
            post.lastUpdated || 0
          ) || Date.now(),
        };
        merged.set(post.url, mergedPost);
      }
    });

    return Array.from(merged.values()).sort((a, b) =>
      (b.lastUpdated || 0) - (a.lastUpdated || 0)
    );
  }

  /**
   * Get persistence statistics with job information
   * Useful for debugging and monitoring
   */
  async getPersistenceStats(localPosts: SavedItem[]): Promise<PersistenceStats> {
    try {
      const postsWithJobs = await this.loadPostsWithJobsFromBackend();
      const backendPosts = postsWithJobs.map(p => p.item_data);
      const localUrls = new Set(localPosts.map(p => p.url));
      const backendUrls = new Set(backendPosts.map(p => p.url));

      const inSync = localUrls.size === backendUrls.size &&
                    [...localUrls].every(url => backendUrls.has(url));

      const jobStats = this.summarizeJobStatuses(postsWithJobs);

      return {
        localCount: localPosts.length,
        backendCount: backendPosts.length,
        syncStatus: inSync ? 'synced' : 'out_of_sync',
        lastSync: this.lastSyncTime,
        jobStats: {
          completed: jobStats.completed || 0,
          processing: jobStats.processing || 0,
          failed: jobStats.failed || 0,
          queued: jobStats.queued || 0,
        },
      };
    } catch (error) {
      return {
        localCount: localPosts.length,
        backendCount: 0,
        syncStatus: 'error',
        lastSync: this.lastSyncTime,
        jobStats: {
          completed: 0,
          processing: 0,
          failed: 0,
          queued: 0,
        },
      };
    }
  }

  /**
   * Migrate guest posts to authenticated user
   * Called when user connects to Pulse Journal
   */
  async migrateGuestPosts(guestId: string, userId: string): Promise<boolean> {
    try {
      const apiUrl = getApiUrl('/api/guest-posts/migrate', 'extractorw');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guestId, userId }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[PostPersistence] ✅ Migrated ${data.migratedCount} posts from guest to user`);
        return true;
      }

      const errorData = await response.json();
      console.error('[PostPersistence] Migration failed:', errorData.error?.message);
      return false;
    } catch (error) {
      console.error('[PostPersistence] Error during migration:', error);
      return false;
    }
  }

  /**
   * Force a complete sync
   * Useful for recovery scenarios
   */
  async forceSync(localPosts: SavedItem[]): Promise<SavedItem[]> {
    console.log('[PostPersistence] 🔄 Force sync requested...');
    this.lastSyncTime = null; // Reset sync time to force fresh sync
    return await this.syncWithBackend(localPosts);
  }
}

export const postPersistenceService = new PostPersistenceService();