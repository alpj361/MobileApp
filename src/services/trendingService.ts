import { supabase, supabaseAvailable, TrendingResponse, TrendingData } from '../config/supabase';

export class TrendingService {
  /** Mock data generator used when Supabase is not configured */
  static getMockTrends(limit: number = 15): TrendingData[] {
    const categories = ['tech', 'ai', 'crypto', 'social', 'news'];
    const now = Date.now();
    return Array.from({ length: limit }).map((_, i) => ({
      id: `mock-${i}`,
      timestamp: new Date(now - i * 600000).toISOString(),
      top_keywords: [],
      category_data: [
        { name: categories[i % categories.length], value: Math.floor(Math.random() * 100) + 1 },
      ],
      statistics: {
        contexto: { local: 100, global: 200 },
        relevancia: { alta: 50, media: 30, baja: 20 },
        total_procesados: 300,
      },
      processing_status: 'complete',
    }));
  }

  /**
   * Obtiene los datos de trending más recientes (solo del día actual)
   */
  static async getLatestTrends(limit: number = 15): Promise<TrendingResponse> {
    if (!supabaseAvailable()) {
      return { data: TrendingService.getMockTrends(limit), error: null };
    }
    try {
      // Get start of today in ISO format
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data, error } = await (supabase as any)
        .from('trends')
        .select('*')
        .eq('processing_status', 'complete')
        .gte('timestamp', todayISO)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        return { data: TrendingService.getMockTrends(limit), error: null };
      }

      return { data, error: null };
    } catch (error) {
      return { data: TrendingService.getMockTrends(limit), error: null };
    }
  }

  /**
   * Obtiene trends por categoría específica (solo del día actual)
   */
  static async getTrendsByCategory(category: string, limit: number = 15): Promise<TrendingResponse> {
    if (!supabaseAvailable()) {
      const data = TrendingService.getMockTrends(limit).filter((t) =>
        t.category_data?.some((c) => c.name === category)
      );
      return { data, error: null };
    }
    try {
      // Get start of today in ISO format
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data, error } = await (supabase as any)
        .from('trends')
        .select('*')
        .eq('processing_status', 'complete')
        .gte('timestamp', todayISO)
        .contains('category_data', [{ name: category }])
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        const mock = TrendingService.getMockTrends(limit).filter((t) =>
          t.category_data?.some((c) => c.name === category)
        );
        return { data: mock, error: null };
      }

      return { data, error: null };
    } catch (error) {
      const mock = TrendingService.getMockTrends(limit).filter((t) =>
        t.category_data?.some((c) => c.name === category)
      );
      return { data: mock, error: null };
    }
  }

  /**
   * Obtiene todas las categorías disponibles
   */
  static async getAvailableCategories(): Promise<string[]> {
    if (!supabaseAvailable()) {
      const mock = TrendingService.getMockTrends(20);
      const cats = new Set<string>();
      mock.forEach((trend) => trend.category_data?.forEach((c) => c.name && cats.add(c.name)));
      return Array.from(cats);
    }
    try {
      const { data, error } = await (supabase as any)
        .from('trends')
        .select('category_data')
        .eq('processing_status', 'complete')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        const mock = TrendingService.getMockTrends(20);
        const cats = new Set<string>();
        mock.forEach((trend) => trend.category_data?.forEach((c) => c.name && cats.add(c.name)));
        return Array.from(cats);
      }

      const categories = new Set<string>();
      data?.forEach((trend: any) => {
        (trend.category_data || []).forEach((c: { name: string }) => {
          if (c.name) categories.add(c.name);
        });
      });

      return Array.from(categories);
    } catch {
      const mock = TrendingService.getMockTrends(20);
      const cats = new Set<string>();
      mock.forEach((trend) => trend.category_data?.forEach((c) => c.name && cats.add(c.name)));
      return Array.from(cats);
    }
  }

  /**
   * Obtiene estadísticas generales de trending (solo del día actual)
   */
  static async getTrendingStats(): Promise<{
    totalTrends: number;
    localTrends: number;
    globalTrends: number;
    highRelevance: number;
  } | null> {
    if (!supabaseAvailable()) {
      return { totalTrends: 300, localTrends: 100, globalTrends: 200, highRelevance: 50 };
    }
    try {
      // Get start of today in ISO format
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data, error } = await (supabase as any)
        .from('trends')
        .select('statistics')
        .eq('processing_status', 'complete')
        .gte('timestamp', todayISO)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return { totalTrends: 300, localTrends: 100, globalTrends: 200, highRelevance: 50 };
      }

      const stats = data[0].statistics;
      return {
        totalTrends: stats.total_procesados || 0,
        localTrends: stats.contexto?.local || 0,
        globalTrends: stats.contexto?.global || 0,
        highRelevance: stats.relevancia?.alta || 0,
      };
    } catch {
      return { totalTrends: 300, localTrends: 100, globalTrends: 200, highRelevance: 50 };
    }
  }
}
