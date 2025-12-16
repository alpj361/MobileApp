/**
 * Backend Configuration
 * Centralized configuration for all backend services
 * Works on both mobile and web platforms
 */

// Helper to get env var that works on web and mobile
function getEnvVar(key: string, fallback: string): string {
  // Try process.env first (works in most cases)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }

  // Fallback to fallback value
  return fallback;
}

/**
 * Platform detection for backend URLs
 */
const isWeb = typeof window !== 'undefined';

/**
 * ExtractorW Backend URL
 * Main backend service for content extraction
 *
 * 🔒 HARDCODED TO PRODUCTION FOR TESTING
 */
export const EXTRACTORW_URL = 'https://server.standatpd.com';

/**
 * ExtractorT Backend URL
 * Twitter/X specific backend service
 *
 * 🔒 HARDCODED TO PRODUCTION FOR TESTING
 */
export const EXTRACTORT_URL = 'https://api.standatpd.com';

/**
 * Check if running in development mode
 */
export const isDevelopment = () => {
  return __DEV__ || process.env.NODE_ENV === 'development';
};

/**
 * Get full API endpoint URL
 * @param path - Optional path to append to base URL
 * @param service - Service to use (extractorw or extractort)
 */
export function getApiUrl(path?: string, service: 'extractorw' | 'extractort' = 'extractorw'): string {
  const baseUrl = service === 'extractorw' ? EXTRACTORW_URL : EXTRACTORT_URL;
  const cleanBase = baseUrl.replace(/\/$/, '');

  // If no path provided, return just the base URL
  if (!path) {
    return cleanBase;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Log configuration (useful for debugging)
 */
export function logBackendConfig() {
  console.log('[Backend Config]', {
    extractorW: EXTRACTORW_URL,
    extractorT: EXTRACTORT_URL,
    isDev: isDevelopment(),
    platform: typeof window !== 'undefined' ? 'web' : 'native',
  });
}

// Log on first load (only in dev)
if (isDevelopment()) {
  logBackendConfig();
}

