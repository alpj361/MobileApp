// Environment configuration (keys must come from .env with EXPO_PUBLIC_ prefix)
export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
  APP_NAME: 'Trending App',
  APP_VERSION: '1.0.0'
};

export const isSupabaseEnabled = () => !!(ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY);
