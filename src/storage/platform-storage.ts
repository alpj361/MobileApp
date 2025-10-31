/**
 * Platform Storage Abstraction
 * Unified storage interface for web and mobile platforms
 * 
 * Mobile: Uses MMKV (fast, synchronous)
 * Web: Uses localStorage (standard web storage)
 */

import { Platform } from 'react-native';

export interface PlatformStorage {
  // String operations
  getString(key: string): string | undefined;
  setString(key: string, value: string): void;
  
  // Number operations
  getNumber(key: string): number | undefined;
  setNumber(key: string, value: number): void;
  
  // Boolean operations
  getBoolean(key: string): boolean | undefined;
  setBoolean(key: string, value: boolean): void;
  
  // Object operations (JSON)
  getObject<T>(key: string): T | undefined;
  setObject<T>(key: string, value: T): void;
  
  // Array operations
  getArray<T>(key: string): T[] | undefined;
  setArray<T>(key: string, value: T[]): void;
  
  // Utility operations
  delete(key: string): void;
  clearAll(): void;
  getAllKeys(): string[];
  contains(key: string): boolean;
}

/**
 * Web Storage Implementation (localStorage)
 */
class WebStorage implements PlatformStorage {
  private prefix = 'vizta_'; // Namespace to avoid conflicts
  
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }
  
  getString(key: string): string | undefined {
    try {
      const value = localStorage.getItem(this.getKey(key));
      return value ?? undefined;
    } catch (error) {
      console.error('[WebStorage] getString error:', error);
      return undefined;
    }
  }
  
  setString(key: string, value: string): void {
    try {
      localStorage.setItem(this.getKey(key), value);
    } catch (error) {
      console.error('[WebStorage] setString error:', error);
    }
  }
  
  getNumber(key: string): number | undefined {
    try {
      const value = this.getString(key);
      if (value === undefined) return undefined;
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    } catch (error) {
      console.error('[WebStorage] getNumber error:', error);
      return undefined;
    }
  }
  
  setNumber(key: string, value: number): void {
    this.setString(key, String(value));
  }
  
  getBoolean(key: string): boolean | undefined {
    try {
      const value = this.getString(key);
      if (value === undefined) return undefined;
      return value === 'true';
    } catch (error) {
      console.error('[WebStorage] getBoolean error:', error);
      return undefined;
    }
  }
  
  setBoolean(key: string, value: boolean): void {
    this.setString(key, String(value));
  }
  
  getObject<T>(key: string): T | undefined {
    try {
      const value = this.getString(key);
      if (value === undefined) return undefined;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('[WebStorage] getObject error:', error);
      return undefined;
    }
  }
  
  setObject<T>(key: string, value: T): void {
    try {
      this.setString(key, JSON.stringify(value));
    } catch (error) {
      console.error('[WebStorage] setObject error:', error);
    }
  }
  
  getArray<T>(key: string): T[] | undefined {
    return this.getObject<T[]>(key);
  }
  
  setArray<T>(key: string, value: T[]): void {
    this.setObject(key, value);
  }
  
  delete(key: string): void {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error('[WebStorage] delete error:', error);
    }
  }
  
  clearAll(): void {
    try {
      const keys = this.getAllKeys();
      keys.forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('[WebStorage] clearAll error:', error);
    }
  }
  
  getAllKeys(): string[] {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      console.error('[WebStorage] getAllKeys error:', error);
      return [];
    }
  }
  
  contains(key: string): boolean {
    return this.getString(key) !== undefined;
  }
}

/**
 * Mobile Storage Implementation (MMKV)
 */
class MMKVStorage implements PlatformStorage {
  private storage: any; // MMKV instance
  
  constructor() {
    // Dynamic import to avoid web bundling issues
    try {
      const { MMKV } = require('react-native-mmkv');
      this.storage = new MMKV();
      console.log('[MMKVStorage] Initialized successfully');
    } catch (error) {
      console.error('[MMKVStorage] Failed to initialize:', error);
      throw error;
    }
  }
  
  getString(key: string): string | undefined {
    try {
      return this.storage.getString(key);
    } catch (error) {
      console.error('[MMKVStorage] getString error:', error);
      return undefined;
    }
  }
  
  setString(key: string, value: string): void {
    try {
      this.storage.set(key, value);
    } catch (error) {
      console.error('[MMKVStorage] setString error:', error);
    }
  }
  
  getNumber(key: string): number | undefined {
    try {
      return this.storage.getNumber(key);
    } catch (error) {
      console.error('[MMKVStorage] getNumber error:', error);
      return undefined;
    }
  }
  
  setNumber(key: string, value: number): void {
    try {
      this.storage.set(key, value);
    } catch (error) {
      console.error('[MMKVStorage] setNumber error:', error);
    }
  }
  
  getBoolean(key: string): boolean | undefined {
    try {
      return this.storage.getBoolean(key);
    } catch (error) {
      console.error('[MMKVStorage] getBoolean error:', error);
      return undefined;
    }
  }
  
  setBoolean(key: string, value: boolean): void {
    try {
      this.storage.set(key, value);
    } catch (error) {
      console.error('[MMKVStorage] setBoolean error:', error);
    }
  }
  
  getObject<T>(key: string): T | undefined {
    try {
      const value = this.getString(key);
      if (value === undefined) return undefined;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('[MMKVStorage] getObject error:', error);
      return undefined;
    }
  }
  
  setObject<T>(key: string, value: T): void {
    try {
      this.setString(key, JSON.stringify(value));
    } catch (error) {
      console.error('[MMKVStorage] setObject error:', error);
    }
  }
  
  getArray<T>(key: string): T[] | undefined {
    return this.getObject<T[]>(key);
  }
  
  setArray<T>(key: string, value: T[]): void {
    this.setObject(key, value);
  }
  
  delete(key: string): void {
    try {
      this.storage.delete(key);
    } catch (error) {
      console.error('[MMKVStorage] delete error:', error);
    }
  }
  
  clearAll(): void {
    try {
      this.storage.clearAll();
    } catch (error) {
      console.error('[MMKVStorage] clearAll error:', error);
    }
  }
  
  getAllKeys(): string[] {
    try {
      return this.storage.getAllKeys();
    } catch (error) {
      console.error('[MMKVStorage] getAllKeys error:', error);
      return [];
    }
  }
  
  contains(key: string): boolean {
    try {
      return this.storage.contains(key);
    } catch (error) {
      console.error('[MMKVStorage] contains error:', error);
      return false;
    }
  }
}

/**
 * Factory function to create platform-appropriate storage
 */
function createPlatformStorage(): PlatformStorage {
  if (Platform.OS === 'web') {
    console.log('[PlatformStorage] Initializing WebStorage (localStorage)');
    return new WebStorage();
  } else {
    console.log('[PlatformStorage] Initializing MMKVStorage');
    return new MMKVStorage();
  }
}

/**
 * Singleton storage instance
 * Automatically uses correct implementation based on platform
 */
export const storage: PlatformStorage = createPlatformStorage();

/**
 * Storage utilities
 */
export const StorageUtils = {
  /**
   * Migrate data from old key to new key
   */
  migrate(oldKey: string, newKey: string): boolean {
    try {
      const value = storage.getString(oldKey);
      if (value !== undefined) {
        storage.setString(newKey, value);
        storage.delete(oldKey);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[StorageUtils] migrate error:', error);
      return false;
    }
  },
  
  /**
   * Get storage info (for debugging)
   */
  getInfo(): {
    platform: string;
    keyCount: number;
    keys: string[];
  } {
    return {
      platform: Platform.OS,
      keyCount: storage.getAllKeys().length,
      keys: storage.getAllKeys(),
    };
  },
  
  /**
   * Export all data (for backup/sync)
   */
  exportAll(): Record<string, string> {
    const data: Record<string, string> = {};
    const keys = storage.getAllKeys();
    keys.forEach(key => {
      const value = storage.getString(key);
      if (value !== undefined) {
        data[key] = value;
      }
    });
    return data;
  },
  
  /**
   * Import data (from backup/sync)
   */
  importAll(data: Record<string, string>): void {
    Object.entries(data).forEach(([key, value]) => {
      storage.setString(key, value);
    });
  },
};

/**
 * Hook for React components (optional, for future use)
 */
export function useStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const getValue = (): T => {
    try {
      const stored = storage.getObject<T>(key);
      return stored !== undefined ? stored : initialValue;
    } catch {
      return initialValue;
    }
  };

  const setValue = (value: T): void => {
    storage.setObject(key, value);
  };

  return [getValue(), setValue];
}

