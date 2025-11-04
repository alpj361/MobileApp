import { createClient } from '@supabase/supabase-js';
import { ENV, isSupabaseEnabled } from './env';

// Web uses the official Supabase client (same as native now)
// The "@supabase/supabase-js" package works correctly on web with proper bundling

console.log('[Supabase Web] Initializing with URL:', ENV.SUPABASE_URL);

// Create Supabase client only if env is configured
export const supabase = isSupabaseEnabled()
  ? createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Importante para web
      },
    })
  : null as any;

export const supabaseAvailable = () => isSupabaseEnabled();

console.log('[Supabase Web] Client initialized:', supabase ? 'SUCCESS' : 'FAILED (no env vars)');

// Re-export types from native version
export type {
  TrendingKeyword,
  TrendingCategory,
  TrendingData,
  TrendingResponse,
  NewsItem,
  Story,
  StoryResponse,
} from './supabase.native';
