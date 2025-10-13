// Supabase Configuration - Referenced as if from .env file
export const SUPABASE_CONFIG = {
  url: process.env.SUPABASE_URL || 'https://qqshdccpmypelhmyqnut.supabase.co',
  anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxc2hkY2NwbXlwZWxobXlxbnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMzY3MTEsImV4cCI6MjA2MTYxMjcxMX0.1ICI-sdyfGsCP4-DdXpenX3jsZvHL-O5SH2zXShjZH0',
  projectId: process.env.SUPABASE_PROJECT_ID || 'qqshdccpmypelhmyqnut',
  region: process.env.SUPABASE_REGION || 'us-east-2'
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
// Strategy: Try local first (if in same network), fallback to production
const LOCAL_URL = 'http://192.168.1.20:8081';
const PRODUCTION_URL = 'https://server.standatpd.com';

// Use env var if explicitly set, otherwise use local in dev, production in release
const isDev = __DEV__;
const defaultExtractorUrl = isDev ? LOCAL_URL : PRODUCTION_URL;

export const EXTRACTORW_URL = process.env.EXPO_PUBLIC_EXTRACTORW_URL || defaultExtractorUrl;
export const EXTRACTORW_FALLBACK_URL = PRODUCTION_URL; // Always available as fallback
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
