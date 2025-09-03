import { createClient } from '@supabase/supabase-js';
import { ENV, isSupabaseEnabled } from './env';

// Create Supabase client only if env is configured
export const supabase = isSupabaseEnabled()
  ? createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY)
  : null as unknown as ReturnType<typeof createClient>;

export const supabaseAvailable = () => isSupabaseEnabled();

// Types for trends table
export interface TrendingKeyword {
  keyword: string;
  count: number;
  category: string;
  about: {
    tipo: string;
    model: string;
    nombre: string;
    source: string;
    categoria: string;
    relevancia: 'alta' | 'media' | 'baja';
    fecha_evento: string;
    contexto_local: boolean;
    palabras_clave: string[];
    razon_tendencia: string;
  };
}

export interface TrendingCategory {
  name: string;
  value: number;
}

export interface TrendingData {
  id: string;
  timestamp: string;
  top_keywords: TrendingKeyword[];
  category_data: TrendingCategory[];
  statistics: {
    contexto: {
      local: number;
      global: number;
    };
    relevancia: {
      alta: number;
      media: number;
      baja: number;
    };
    total_procesados: number;
  };
  processing_status: string;
}

export interface TrendingResponse {
  data: TrendingData[] | null;
  error: any;
}

// Types for news table
export interface NewsItem {
  id: string;
  title: string;
  source: string;
  date: string;
  excerpt: string;
  category: string;
  keywords: string[];
  url?: string;
}
