/**
 * Job Recovery Service
 * Recovers active jobs from backend when app reloads
 * Jobs persist on server, not in localStorage
 */

import { getApiUrl } from '../../config/backend';
import { guestSessionManager } from '../../services/guestSessionManager';
import { XAsyncJob } from '../../services/xAsyncService';

export interface ActiveJobInfo {
  jobId: string;
  url: string;
  status: string;
  progress: number;
  createdAt: string;
  itemId?: string; // SavedItem ID if applicable
}

class JobRecoveryService {
  /**
   * Get all active jobs for current session (guest or authenticated)
   */
  async getActiveJobs(): Promise<ActiveJobInfo[]> {
    try {
      const headers = await guestSessionManager.getApiHeaders();
      const apiUrl = getApiUrl('/api/jobs/active', 'extractorw');

      console.log('[JobRecovery] Fetching active jobs...');

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        console.warn('[JobRecovery] Failed to fetch active jobs:', response.status);
        return [];
      }

      const data = await response.json();

      if (!data.success) {
        console.warn('[JobRecovery] Server returned error:', data.error);
        return [];
      }

      const jobs: ActiveJobInfo[] = data.jobs || [];
      console.log(`[JobRecovery] Found ${jobs.length} active job(s)`);

      return jobs;
    } catch (error) {
      console.error('[JobRecovery] Error fetching active jobs:', error);
      return [];
    }
  }

  /**
   * Get active jobs for a specific URL
   * Useful for checking if a URL already has a running job
   */
  async getActiveJobForUrl(url: string): Promise<ActiveJobInfo | null> {
    const activeJobs = await this.getActiveJobs();
    return activeJobs.find(job => job.url === url) || null;
  }

  /**
   * Check if there's an active job for a URL
   */
  async hasActiveJobForUrl(url: string): Promise<boolean> {
    const job = await this.getActiveJobForUrl(url);
    return job !== null;
  }

  /**
   * Get count of active jobs
   */
  async getActiveJobCount(): Promise<number> {
    const jobs = await this.getActiveJobs();
    return jobs.length;
  }

  /**
   * Recover jobs on app start
   * Returns jobs that need to be resumed
   */
  async recoverJobsOnStart(): Promise<ActiveJobInfo[]> {
    console.log('[JobRecovery] Recovering jobs on app start...');

    const activeJobs = await this.getActiveJobs();

    if (activeJobs.length === 0) {
      console.log('[JobRecovery] No jobs to recover');
      return [];
    }

    // ✅ FIX Bug #4: Include 'completed' jobs so frontend can recover results
    const processingJobs = activeJobs.filter(
      job => job.status === 'queued' || job.status === 'processing' || job.status === 'completed'
    );

    console.log(`[JobRecovery] Found ${processingJobs.length} job(s) to resume`);

    return processingJobs;
  }

  /**
   * Clean up completed jobs from server
   * Optional - server should handle this automatically
   */
  async cleanupCompletedJobs(): Promise<void> {
    try {
      const headers = await guestSessionManager.getApiHeaders();
      const apiUrl = getApiUrl('/api/jobs/cleanup', 'extractorw');

      await fetch(apiUrl, {
        method: 'POST',
        headers,
      });

      console.log('[JobRecovery] Cleanup request sent');
    } catch (error) {
      console.warn('[JobRecovery] Failed to cleanup jobs:', error);
    }
  }
}

export const jobRecoveryService = new JobRecoveryService();
