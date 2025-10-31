import { ENV, isSupabaseEnabled } from './env';

// Web-compatible Supabase client using fetch API
// This avoids the module resolution issues with @supabase/supabase-js on web

class WebSupabaseClient {
  private url: string;
  private key: string;
  private headers: HeadersInit;

  constructor(url: string, key: string) {
    this.url = url;
    this.key = key;
    this.headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    };
  }

  from(table: string) {
    return {
      select: async (columns: string = '*') => {
        try {
          const response = await fetch(`${this.url}/rest/v1/${table}?select=${columns}`, {
            headers: this.headers,
          });
          const data = await response.json();
          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      insert: async (values: any) => {
        try {
          const response = await fetch(`${this.url}/rest/v1/${table}`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(values),
          });
          const data = await response.json();
          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      update: async (values: any) => {
        return {
          eq: async (column: string, value: any) => {
            try {
              const response = await fetch(`${this.url}/rest/v1/${table}?${column}=eq.${value}`, {
                method: 'PATCH',
                headers: this.headers,
                body: JSON.stringify(values),
              });
              const data = await response.json();
              return { data, error: null };
            } catch (error) {
              return { data: null, error };
            }
          },
        };
      },
      delete: () => {
        return {
          eq: async (column: string, value: any) => {
            try {
              const response = await fetch(`${this.url}/rest/v1/${table}?${column}=eq.${value}`, {
                method: 'DELETE',
                headers: this.headers,
              });
              const data = await response.json();
              return { data, error: null };
            } catch (error) {
              return { data: null, error };
            }
          },
        };
      },
    };
  }
}

// Create web-compatible Supabase client
export const supabase = isSupabaseEnabled()
  ? new WebSupabaseClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY)
  : null as any;

export const supabaseAvailable = () => isSupabaseEnabled();

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
