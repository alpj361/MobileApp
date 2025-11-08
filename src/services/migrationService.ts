/**
 * Migration Service
 * Handles migration of guest data to authenticated user accounts
 * Migrates jobs when user connects to Pulse Journal
 */

import { getApiUrl } from '../config/backend';
import { guestSessionManager } from './guestSessionManager';

export interface MigrationResult {
  success: boolean;
  migratedJobs: number;
  errors?: string[];
}

class MigrationService {
  /**
   * Migrate guest jobs to authenticated user
   * Called when user connects to Pulse Journal
   */
  async migrateGuestData(userId: string, guestId: string): Promise<MigrationResult> {
    console.log('[Migration] Starting migration from guest to user');
    console.log('[Migration] Guest ID:', guestId.substring(0, 8) + '...');
    console.log('[Migration] User ID:', userId);

    try {
      const apiUrl = getApiUrl('/api/jobs/migrate-guest', 'extractorw');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guestId,
          userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        console.error('[Migration] Failed to migrate data:', error);

        return {
          success: false,
          migratedJobs: 0,
          errors: [error.error?.message || 'Migration failed'],
        };
      }

      const data = await response.json();

      console.log('[Migration] Migration successful:', data);

      return {
        success: true,
        migratedJobs: data.migratedJobs || 0,
      };
    } catch (error) {
      console.error('[Migration] Migration error:', error);

      return {
        success: false,
        migratedJobs: 0,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Automatically migrate when user authenticates
   * This should be called after successful Pulse Journal connection
   */
  async autoMigrateOnAuthentication(userId: string, userEmail: string): Promise<MigrationResult | null> {
    // Get the current guest ID before switching
    const currentGuestId = guestSessionManager.getGuestId();

    if (!currentGuestId) {
      console.log('[Migration] No guest ID found - skipping migration');
      return null;
    }

    console.log('[Migration] Auto-migrating guest data for:', userEmail);

    // Perform migration
    const result = await this.migrateGuestData(userId, currentGuestId);

    // Switch to authenticated mode after migration
    await guestSessionManager.switchToAuthenticated(userId, userEmail);

    return result;
  }

  /**
   * Get pending jobs for guest user
   * Useful for showing user what will be migrated
   */
  async getGuestPendingJobs(guestId: string): Promise<number> {
    try {
      const apiUrl = getApiUrl(`/api/jobs/guest-pending/${guestId}`, 'extractorw');

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Guest-Id': guestId,
        },
      });

      if (!response.ok) {
        console.warn('[Migration] Failed to get pending jobs');
        return 0;
      }

      const data = await response.json();
      return data.pendingJobs || 0;
    } catch (error) {
      console.warn('[Migration] Error getting pending jobs:', error);
      return 0;
    }
  }

  /**
   * Check if guest has any data to migrate
   */
  async hasDataToMigrate(guestId: string): Promise<boolean> {
    const pendingJobs = await this.getGuestPendingJobs(guestId);
    return pendingJobs > 0;
  }
}

export const migrationService = new MigrationService();
