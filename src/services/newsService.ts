import { supabase, supabaseAvailable, NewsItem } from '../config/supabase';

export interface NewsResponse {
  data: NewsItem[];
  error: string | null;
}

export class NewsService {
  
  /**
   * Función para limpiar HTML y fragmentos de código (copiada de ThePulse)
   */
  private static cleanText(text: string): string {
    if (!text) return '';
    return text
      .replace(/<[^>]*>/g, '') // Eliminar etiquetas HTML
      .replace(/\[&#8230;\]/g, '...') // Reemplazar entidades HTML
      .replace(/The post .* appeared first on .*/g, '') // Eliminar texto de "appeared first"
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();
  }

  /**
   * Obtiene las últimas noticias de la tabla news en Supabase
   * Basado en getLatestNews() de ThePulse
   */
  static async getLatestNews(limit: number = 10): Promise<NewsResponse> {
    if (!supabaseAvailable()) {
      return { 
        data: NewsService.getMockNews(limit), 
        error: null 
      };
    }

    try {
      console.log('🔍 NewsService: Iniciando consulta a tabla news...');
      
      const { data, error } = await (supabase as any)
        .from('news')
        .select(`
          id,
          titulo,
          resumen,
          fuente,
          url,
          fecha,
          categoria,
          raw,
          created_at
        `)
        .order('fecha', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ NewsService: Error en consulta:', error);
        return { 
          data: NewsService.getMockNews(limit), 
          error: null 
        };
      }

      if (!data || data.length === 0) {
        console.log('⚠️ NewsService: No se encontraron noticias');
        return { 
          data: [], 
          error: null 
        };
      }

      console.log(`✅ NewsService: ${data.length} noticias obtenidas`);

      // Mapear a NewsItem (mismo formato que ThePulse)
      const mappedData: NewsItem[] = data.map((item: any) => ({
        id: item.id,
        title: item.titulo,
        source: item.fuente,
        date: item.fecha,
        excerpt: NewsService.cleanText(item.resumen),
        category: item.categoria || 'General',
        keywords: [], // No keywords column in database, using empty array
        url: item.url
      }));

      return { data: mappedData, error: null };

    } catch (error) {
      console.error('❌ NewsService: Error obteniendo noticias:', error);
      return { 
        data: NewsService.getMockNews(limit), 
        error: null 
      };
    }
  }

  /**
   * Obtiene noticias por categoría específica
   */
  static async getNewsByCategory(category: string, limit: number = 10): Promise<NewsResponse> {
    if (!supabaseAvailable()) {
      const mockData = NewsService.getMockNews(limit * 2)
        .filter(news => news.category.toLowerCase() === category.toLowerCase());
      return { 
        data: mockData.slice(0, limit), 
        error: null 
      };
    }

    try {
      const { data, error } = await (supabase as any)
        .from('news')
        .select(`
          id,
          titulo,
          resumen,
          fuente,
          url,
          fecha,
          categoria,
          raw,
          created_at
        `)
        .eq('categoria', category)
        .order('fecha', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ NewsService: Error obteniendo noticias por categoría:', error);
        return { 
          data: NewsService.getMockNews(limit), 
          error: null 
        };
      }

      const mappedData: NewsItem[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.titulo,
        source: item.fuente,
        date: item.fecha,
        excerpt: NewsService.cleanText(item.resumen),
        category: item.categoria || 'General',
        keywords: [], // No keywords column in database, using empty array
        url: item.url
      }));

      return { data: mappedData, error: null };

    } catch (error) {
      console.error('❌ NewsService: Error obteniendo noticias por categoría:', error);
      return { 
        data: NewsService.getMockNews(limit), 
        error: null 
      };
    }
  }

  /**
   * Obtiene todas las categorías disponibles
   */
  static async getAvailableCategories(): Promise<string[]> {
    if (!supabaseAvailable()) {
      return ['Política', 'Economía', 'Deportes', 'Entretenimiento', 'Tecnología', 'Sociedad'];
    }

    try {
      const { data, error } = await (supabase as any)
        .from('news')
        .select('categoria')
        .order('fecha', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ NewsService: Error obteniendo categorías:', error);
        return ['Política', 'Economía', 'Deportes', 'Entretenimiento', 'Tecnología', 'Sociedad'];
      }

      const categories = new Set<string>();
      data?.forEach((item: any) => {
        if (item.categoria && item.categoria.trim() !== '') {
          categories.add(item.categoria);
        }
      });

      return Array.from(categories);

    } catch (error) {
      console.error('❌ NewsService: Error obteniendo categorías:', error);
      return ['Política', 'Economía', 'Deportes', 'Entretenimiento', 'Tecnología', 'Sociedad'];
    }
  }

  /**
   * Obtiene estadísticas de noticias
   */
  static async getNewsStats(): Promise<{
    totalNews: number;
    categoriesCount: number;
    recentNews: number;
    sourcesCount: number;
  } | null> {
    if (!supabaseAvailable()) {
      return {
        totalNews: 150,
        categoriesCount: 6,
        recentNews: 25,
        sourcesCount: 8
      };
    }

    try {
      // Obtener total de noticias
      const { count: totalNews } = await (supabase as any)
        .from('news')
        .select('*', { count: 'exact', head: true });

      // Obtener noticias recientes (últimas 24 horas)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { count: recentNews } = await (supabase as any)
        .from('news')
        .select('*', { count: 'exact', head: true })
        .gte('fecha', yesterday.toISOString());

      // Obtener categorías y fuentes únicas
      const { data: uniqueData } = await (supabase as any)
        .from('news')
        .select('categoria, fuente')
        .limit(1000);

      const categories = new Set();
      const sources = new Set();
      
      uniqueData?.forEach((item: any) => {
        if (item.categoria) categories.add(item.categoria);
        if (item.fuente) sources.add(item.fuente);
      });

      return {
        totalNews: totalNews || 0,
        categoriesCount: categories.size,
        recentNews: recentNews || 0,
        sourcesCount: sources.size
      };

    } catch (error) {
      console.error('❌ NewsService: Error obteniendo estadísticas:', error);
      return {
        totalNews: 150,
        categoriesCount: 6,
        recentNews: 25,
        sourcesCount: 8
      };
    }
  }

  /**
   * Mock data para desarrollo cuando Supabase no esté disponible
   */
  private static getMockNews(limit: number = 10): NewsItem[] {
    const categories = ['Política', 'Economía', 'Deportes', 'Entretenimiento', 'Tecnología', 'Sociedad'];
    const sources = ['Prensa Libre', 'El Periódico', 'República', 'ConCriterio', 'Soy502', 'La Hora'];
    
    return Array.from({ length: limit }).map((_, i) => ({
      id: `mock-news-${i}`,
      title: `Noticia de prueba ${i + 1}: Desarrollo importante en Guatemala`,
      source: sources[i % sources.length],
      date: new Date(Date.now() - i * 3600000).toISOString(), // Últimas horas
      excerpt: `Esta es una descripción de prueba para la noticia ${i + 1}. Contiene información relevante sobre eventos actuales en Guatemala y su impacto en la sociedad.`,
      category: categories[i % categories.length],
      keywords: ['guatemala', 'noticia', 'actualidad'],
      url: `https://example.com/noticia-${i + 1}`
    }));
  }
}
