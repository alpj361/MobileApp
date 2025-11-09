// Helper to safely get env var (works on web and native)
// Note: On web, only EXPO_PUBLIC_* variables are exposed by Expo
// For Supabase, we use hardcoded fallbacks since SUPABASE_* vars aren't prefixed with EXPO_PUBLIC_
function getEnv(key: string, fallback: string): string {
  const envValue = typeof process !== 'undefined' && process.env && process.env[key];
  if (envValue) {
    console.log(`[ENV] Using env var ${key}: ${envValue.substring(0, 20)}...`);
    return envValue as string;
  }
  console.log(`[ENV] Using fallback for ${key}: ${fallback.substring(0, 20)}...`);
  return fallback;
}

// Supabase Configuration - With safe env var access
// These use hardcoded fallbacks because SUPABASE_* vars don't have EXPO_PUBLIC_ prefix
export const SUPABASE_CONFIG = {
  url: getEnv('SUPABASE_URL', 'https://qqshdccpmypelhmyqnut.supabase.co'),
  anonKey: getEnv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxc2hkY2NwbXlwZWxobXlxbnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMzY3MTEsImV4cCI6MjA2MTYxMjcxMX0.1ICI-sdyfGsCP4-DdXpenX3jsZvHL-O5SH2zXShjZH0'),
  projectId: getEnv('SUPABASE_PROJECT_ID', 'qqshdccpmypelhmyqnut'),
  region: getEnv('SUPABASE_REGION', 'us-east-2')
} as const;

// Database Configuration
export const DB_CONFIG = {
  host: process.env.SUPABASE_DB_HOST || 'db.qqshdccpmypelhmyqnut.supabase.co',
  version: process.env.SUPABASE_DB_VERSION || '15.8.1.079',
  postgresEngine: process.env.SUPABASE_DB_ENGINE || '15'
} as const;

// Export individual variables for direct use
export const SUPABASE_URL = process.env.SUPABASE_URL || SUPABASE_CONFIG.url;
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || SUPABASE_CONFIG.anonKey;
export const SUPABASE_PROJECT_ID = process.env.SUPABASE_PROJECT_ID || SUPABASE_CONFIG.projectId;
export const SUPABASE_REGION = process.env.SUPABASE_REGION || SUPABASE_CONFIG.region;

// Compatibility with existing code - ENV object
export const ENV = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_PROJECT_ID,
  SUPABASE_REGION
} as const;

// ExtractorW Configuration (Backend Services)
// Uses EXPO_PUBLIC_EXTRACTORW_URL from .env file with fallback to production
export const EXTRACTORW_URL = process.env.EXPO_PUBLIC_EXTRACTORW_URL || 'https://server.standatpd.com';
export const BEARER_TOKEN = process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

// Function to check if Supabase is enabled (compatibility)
export const isSupabaseEnabled = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
};

// Function to get all environment variables
export const getEnvVars = () => ({
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_PROJECT_ID,
  SUPABASE_REGION,
  EXTRACTORW_URL,
  BEARER_TOKEN
});
