/**
 * Job Persistence Service
 * Manages persistent storage of async jobs to survive page reloads
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface PersistedJob {
  jobId: string;
  url: string;
  startTime: number;
  lastCheck: number;
  platform: 'x' | 'instagram' | 'tiktok';
  itemId?: string; // SavedItem ID if applicable
}

const STORAGE_KEY = 'pulse_active_jobs';
const MAX_JOB_AGE = 24 * 60 * 60 * 1000; // 24 hours

class JobPersistenceService {
  private getStorage() {
    // Use localStorage on web, AsyncStorage on mobile
    const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

    if (isWeb) {
      return {
        getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
        setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
        removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
      };
    } else {
      return AsyncStorage;
    }
  }

  async saveJob(job: PersistedJob): Promise<void> {
    try {
      const storage = this.getStorage();
      const existingJobs = await this.getActiveJobs();

      // Remove old job with same URL if exists
      const filteredJobs = existingJobs.filter(j => j.url !== job.url);

      // Add new job
      const updatedJobs = [...filteredJobs, job];

      await storage.setItem(STORAGE_KEY, JSON.stringify(updatedJobs));
      console.log('[JobPersistence] Saved job:', job.jobId);
    } catch (error) {
      console.error('[JobPersistence] Failed to save job:', error);
    }
  }

  async getActiveJobs(): Promise<PersistedJob[]> {
    try {
      const storage = this.getStorage();
      const data = await storage.getItem(STORAGE_KEY);

      if (!data) return [];

      const jobs: PersistedJob[] = JSON.parse(data);
      const now = Date.now();

      // Filter out old jobs
      const activeJobs = jobs.filter(job => {
        const age = now - job.startTime;
        return age < MAX_JOB_AGE;
      });

      // Save back filtered list if we removed any
      if (activeJobs.length !== jobs.length) {
        await storage.setItem(STORAGE_KEY, JSON.stringify(activeJobs));
      }

      return activeJobs;
    } catch (error) {
      console.error('[JobPersistence] Failed to get active jobs:', error);
      return [];
    }
  }

  async removeJob(jobId: string): Promise<void> {
    try {
      const storage = this.getStorage();
      const existingJobs = await this.getActiveJobs();
      const filteredJobs = existingJobs.filter(j => j.jobId !== jobId);

      await storage.setItem(STORAGE_KEY, JSON.stringify(filteredJobs));
      console.log('[JobPersistence] Removed job:', jobId);
    } catch (error) {
      console.error('[JobPersistence] Failed to remove job:', error);
    }
  }

  async removeJobByUrl(url: string): Promise<void> {
    try {
      const storage = this.getStorage();
      const existingJobs = await this.getActiveJobs();
      const filteredJobs = existingJobs.filter(j => j.url !== url);

      await storage.setItem(STORAGE_KEY, JSON.stringify(filteredJobs));
      console.log('[JobPersistence] Removed job by URL:', url);
    } catch (error) {
      console.error('[JobPersistence] Failed to remove job by URL:', error);
    }
  }

  async updateJobLastCheck(jobId: string): Promise<void> {
    try {
      const storage = this.getStorage();
      const existingJobs = await this.getActiveJobs();
      const updatedJobs = existingJobs.map(job =>
        job.jobId === jobId
          ? { ...job, lastCheck: Date.now() }
          : job
      );

      await storage.setItem(STORAGE_KEY, JSON.stringify(updatedJobs));
    } catch (error) {
      console.error('[JobPersistence] Failed to update job last check:', error);
    }
  }

  async clearAllJobs(): Promise<void> {
    try {
      const storage = this.getStorage();
      await storage.removeItem(STORAGE_KEY);
      console.log('[JobPersistence] Cleared all jobs');
    } catch (error) {
      console.error('[JobPersistence] Failed to clear jobs:', error);
    }
  }

  async getJobByUrl(url: string): Promise<PersistedJob | null> {
    const jobs = await this.getActiveJobs();
    return jobs.find(job => job.url === url) || null;
  }

  async hasActiveJobForUrl(url: string): Promise<boolean> {
    const job = await this.getJobByUrl(url);
    return job !== null;
  }
}

export const jobPersistence = new JobPersistenceService();