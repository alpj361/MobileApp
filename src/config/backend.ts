/**
 * Backend Configuration
 * Centralized configuration for all backend services
 * Works on both mobile and web platforms
 *
 * 🔧 LOCAL DEVELOPMENT MODE:
 * - Create a .env.local file with localhost URLs
 * - Copy .env.local to .env for local testing
 * - Start ExtractorW: cd "../Pulse Journal/ExtractorW" && npm start
 * - Start ExtractorT: cd "../Pulse Journal/ExtractorT" && docker-compose -f docker-compose.local.yaml up
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
 * Detect if running in local development mode
 */
function isLocalDevelopment(): boolean {
  const extractorwUrl = getEnvVar('EXPO_PUBLIC_EXTRACTORW_URL', '');
  const extractortUrl = getEnvVar('EXPO_PUBLIC_EXTRACTORT_URL', '');

  return extractorwUrl.includes('localhost') ||
         extractorwUrl.includes('127.0.0.1') ||
         extractortUrl.includes('localhost') ||
         extractortUrl.includes('127.0.0.1');
}

/**
 * ExtractorW Backend URL
 * Main backend service for content extraction
 *
 * 🌐 Production: https://server.standatpd.com
 * 💻 Local Dev: http://localhost:3456 (configure in .env)
 */
export const EXTRACTORW_URL = getEnvVar('EXPO_PUBLIC_EXTRACTORW_URL', 'https://server.standatpd.com');

/**
 * ExtractorT Backend URL
 * Twitter/X specific backend service
 *
 * 🌐 Production: https://api.standatpd.com
 * 💻 Local Dev: http://localhost:8000 (configure in .env)
 */
export const EXTRACTORT_URL = getEnvVar('EXPO_PUBLIC_EXTRACTORT_URL', 'https://api.standatpd.com');

/**
 * Check if running in local development mode
 */
export const IS_LOCAL_DEV = isLocalDevelopment();

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
  const mode = IS_LOCAL_DEV ? '💻 LOCAL DEV' : '🌐 PRODUCTION';
  console.log(`[Backend Config] ${mode}`, {
    extractorW: EXTRACTORW_URL,
    extractorT: EXTRACTORT_URL,
    isLocalDev: IS_LOCAL_DEV,
    isDev: isDevelopment(),
    platform: typeof window !== 'undefined' ? 'web' : 'native',
  });
}

// Log on first load (only in dev)
if (isDevelopment()) {
  logBackendConfig();
}

