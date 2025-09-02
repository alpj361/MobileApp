import { supabase, TrendingResponse, TrendingData } from '../config/supabase';

export class TrendingService {
  /**
   * Obtiene los datos de trending más recientes
   */
  static async getLatestTrends(limit: number = 10): Promise<TrendingResponse> {
    try {
      const { data, error } = await supabase
        .from('trends')
        .select('*')
        .eq('processing_status', 'complete')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching trends:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Exception in getLatestTrends:', error);
      return { data: null, error };
    }
  }

  /**
   * Obtiene trends por categoría específica
   */
  static async getTrendsByCategory(category: string, limit: number = 10): Promise<TrendingResponse> {
    try {
      const { data, error } = await supabase
        .from('trends')
        .select('*')
        .eq('processing_status', 'complete')
        .contains('category_data', [{ name: category }])
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching trends by category:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Exception in getTrendsByCategory:', error);
      return { data: null, error };
    }
  }

  /**
   * Obtiene todas las categorías disponibles
   */
  static async getAvailableCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('trends')
        .select('category_data')
        .eq('processing_status', 'complete')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }

      // Extraer categorías únicas de todos los trends
      const categories = new Set<string>();
      data?.forEach(trend => {
        trend.category_data?.forEach(cat => {
          if (cat.name) {
            categories.add(cat.name);
          }
        });
      });

      return Array.from(categories);
    } catch (error) {
      console.error('Exception in getAvailableCategories:', error);
      return [];
    }
  }

  /**
   * Obtiene estadísticas generales de trending
   */
  static async getTrendingStats(): Promise<{
    totalTrends: number;
    localTrends: number;
    globalTrends: number;
    highRelevance: number;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('trends')
        .select('statistics')
        .eq('processing_status', 'complete')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return null;
      }

      const stats = data[0].statistics;
      return {
        totalTrends: stats.total_procesados || 0,
        localTrends: stats.contexto?.local || 0,
        globalTrends: stats.contexto?.global || 0,
        highRelevance: stats.relevancia?.alta || 0,
      };
    } catch (error) {
      console.error('Exception in getTrendingStats:', error);
      return null;
    }
  }
}
