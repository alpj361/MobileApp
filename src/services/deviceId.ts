/**
 * Device ID Service
 * Generates and manages a persistent device identifier for guest users
 * This allows jobs and data to persist across sessions without authentication
 */

import { asyncStorageAdapter } from '../storage/platform-storage';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'pulse_device_id';
const DEVICE_INFO_KEY = 'pulse_device_info';

export interface DeviceInfo {
  deviceId: string;
  platform: string;
  createdAt: number;
  lastActive: number;
}

class DeviceIdService {
  private deviceId: string | null = null;
  private deviceInfo: DeviceInfo | null = null;

  /**
   * Get storage adapter (uses platform-aware storage)
   * Web: localStorage, Mobile: AsyncStorage
   */
  private getStorage() {
    return asyncStorageAdapter;
  }

  /**
   * Generate a new UUID v4
   */
  private generateUUID(): string {
    // Try crypto.randomUUID if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback to manual generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Get or create device ID
   * This is the main function to get the device identifier
   */
  async getOrCreateDeviceId(): Promise<string> {
    // Return cached value if available
    if (this.deviceId) {
      return this.deviceId;
    }

    const storage = this.getStorage();

    // Try to load existing device ID
    const existingId = await storage.getItem(DEVICE_ID_KEY);

    if (existingId) {
      console.log('[DeviceId] Found existing device ID:', existingId.substring(0, 8) + '...');
      this.deviceId = existingId;

      // Update last active timestamp
      await this.updateLastActive();

      return existingId;
    }

    // Generate new device ID
    const newId = this.generateUUID();
    console.log('[DeviceId] Generated new device ID:', newId.substring(0, 8) + '...');

    // Save to storage
    await storage.setItem(DEVICE_ID_KEY, newId);
    this.deviceId = newId;

    // Create device info
    const deviceInfo: DeviceInfo = {
      deviceId: newId,
      platform: Platform.OS,
      createdAt: Date.now(),
      lastActive: Date.now(),
    };

    await storage.setItem(DEVICE_INFO_KEY, JSON.stringify(deviceInfo));
    this.deviceInfo = deviceInfo;

    return newId;
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(): Promise<void> {
    if (!this.deviceId) {
      return;
    }

    const storage = this.getStorage();
    const infoStr = await storage.getItem(DEVICE_INFO_KEY);

    if (infoStr) {
      const info: DeviceInfo = JSON.parse(infoStr);
      info.lastActive = Date.now();

      await storage.setItem(DEVICE_INFO_KEY, JSON.stringify(info));
      this.deviceInfo = info;
    }
  }

  /**
   * Get device info
   */
  async getDeviceInfo(): Promise<DeviceInfo | null> {
    if (this.deviceInfo) {
      return this.deviceInfo;
    }

    const storage = this.getStorage();
    const infoStr = await storage.getItem(DEVICE_INFO_KEY);

    if (infoStr) {
      this.deviceInfo = JSON.parse(infoStr);
      return this.deviceInfo;
    }

    return null;
  }

  /**
   * Clear device ID (for testing or logout)
   */
  async clearDeviceId(): Promise<void> {
    const storage = this.getStorage();
    await storage.removeItem(DEVICE_ID_KEY);
    await storage.removeItem(DEVICE_INFO_KEY);

    this.deviceId = null;
    this.deviceInfo = null;

    console.log('[DeviceId] Device ID cleared');
  }

  /**
   * Get cached device ID without async call
   * Returns null if not yet loaded
   */
  getCachedDeviceId(): string | null {
    return this.deviceId;
  }
}

export const deviceIdService = new DeviceIdService();
