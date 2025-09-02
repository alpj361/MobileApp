import { LOCAL_SUPABASE } from "../env.srt";

// Environment configuration (keys must come from .env with EXPO_PUBLIC_ prefix)
const urlFromEnv = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const keyFromEnv = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

const url = LOCAL_SUPABASE?.url || urlFromEnv;
const anon = LOCAL_SUPABASE?.anonKey || keyFromEnv;

export const ENV = {
  SUPABASE_URL: url,
  SUPABASE_ANON_KEY: anon,
  APP_NAME: 'Trending App',
  APP_VERSION: '1.0.0'
};

export const isSupabaseEnabled = () => !!(ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY);
