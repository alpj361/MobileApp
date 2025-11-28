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
      console.log('[JobPersistence] ✅ Saved job to storage:', {
        jobId: job.jobId,
        url: job.url,
        platform: job.platform,
        totalJobs: updatedJobs.length,
        storageType: typeof window !== 'undefined' ? 'localStorage' : 'AsyncStorage'
      });
    } catch (error) {
      console.error('[JobPersistence] ❌ Failed to save job:', error);
      // On web, check if localStorage is available
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
        } catch (storageError) {
          console.error('[JobPersistence] ⚠️ localStorage not available:', storageError);
        }
      }
      throw error;
    }
  }

  async getActiveJobs(): Promise<PersistedJob[]> {
    try {
      const storage = this.getStorage();
      const data = await storage.getItem(STORAGE_KEY);

      if (!data) {
        console.log('[JobPersistence] 📭 No jobs in storage');
        return [];
      }

      const jobs: PersistedJob[] = JSON.parse(data);
      const now = Date.now();

      console.log('[JobPersistence] 📦 Raw jobs in storage:', jobs.length);

      // Filter out old jobs
      const activeJobs = jobs.filter(job => {
        const age = now - job.startTime;
        const isActive = age < MAX_JOB_AGE;
        if (!isActive) {
          console.log('[JobPersistence] 🗑️ Removing old job:', job.jobId, 'Age:', Math.floor(age / 1000 / 60), 'minutes');
        }
        return isActive;
      });

      // Save back filtered list if we removed any
      if (activeJobs.length !== jobs.length) {
        await storage.setItem(STORAGE_KEY, JSON.stringify(activeJobs));
        console.log('[JobPersistence] 🧹 Cleaned up', jobs.length - activeJobs.length, 'old job(s)');
      }

      console.log('[JobPersistence] ✅ Active jobs:', activeJobs.length);
      return activeJobs;
    } catch (error) {
      console.error('[JobPersistence] ❌ Failed to get active jobs:', error);
      // Try to recover from corrupted data
      if (typeof window !== 'undefined') {
        try {
          console.log('[JobPersistence] 🔧 Attempting to clear corrupted storage');
          localStorage.removeItem(STORAGE_KEY);
        } catch (clearError) {
          console.error('[JobPersistence] Failed to clear storage:', clearError);
        }
      }
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