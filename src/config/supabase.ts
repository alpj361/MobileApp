import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';

// Crear cliente de Supabase usando variables de entorno
export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);

// Tipos para la tabla trends
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
