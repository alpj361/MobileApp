import { supabase, supabaseAvailable, Story, StoryResponse, TrendingData, NewsItem } from '../config/supabase';

export class StoriesService {
  
  /**
   * Obtiene todas las stories activas ordenadas por prioridad
   */
  static async getActiveStories(): Promise<Story[]> {
    if (!supabaseAvailable()) {
      console.warn('Supabase not available, returning mock stories');
      return this.getMockStories();
    }

    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching stories:', error);
        return this.getMockStories();
      }

      return data || [];
    } catch (error) {
      console.error('Error in getActiveStories:', error);
      return this.getMockStories();
    }
  }

  /**
   * Obtiene stories por categoría específica
   */
  static async getStoriesByCategory(category: string): Promise<Story[]> {
    if (!supabaseAvailable()) {
      return this.getMockStories().filter(s => s.category === category);
    }

    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching stories by category:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getStoriesByCategory:', error);
      return [];
    }
  }

  /**
   * Incrementa el contador de vistas de un story
   */
  static async incrementViewCount(storyId: string): Promise<void> {
    if (!supabaseAvailable()) return;

    try {
      const { error } = await supabase
        .from('stories')
        .update({ view_count: supabase.sql`view_count + 1` })
        .eq('id', storyId);

      if (error) {
        console.error('Error incrementing view count:', error);
      }
    } catch (error) {
      console.error('Error in incrementViewCount:', error);
    }
  }

  /**
   * Incrementa el contador de shares de un story
   */
  static async incrementShareCount(storyId: string): Promise<void> {
    if (!supabaseAvailable()) return;

    try {
      const { error } = await supabase
        .from('stories')
        .update({ share_count: supabase.sql`share_count + 1` })
        .eq('id', storyId);

      if (error) {
        console.error('Error incrementing share count:', error);
      }
    } catch (error) {
      console.error('Error in incrementShareCount:', error);
    }
  }

  /**
   * Crea un nuevo story
   */
  static async createStory(story: Omit<Story, 'id' | 'view_count' | 'share_count' | 'created_at'>): Promise<Story | null> {
    if (!supabaseAvailable()) {
      console.warn('Supabase not available, cannot create story');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('stories')
        .insert([story])
        .select()
        .single();

      if (error) {
        console.error('Error creating story:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createStory:', error);
      return null;
    }
  }

  /**
   * Genera stories automáticamente basado en trends y news recientes
   */
  static async generateAutomaticStories(): Promise<Story[]> {
    try {
      // Obtener trends y news recientes
      const [trendsData, newsData] = await Promise.all([
        this.getRecentTrends(),
        this.getRecentNews()
      ]);

      const generatedStories: Story[] = [];

      // Generar story de trending topics
      if (trendsData.length > 0) {
        const trendingStory = this.generateTrendingStory(trendsData);
        if (trendingStory) {
          const created = await this.createStory(trendingStory);
          if (created) generatedStories.push(created);
        }
      }

      // Generar story de breaking news
      if (newsData.length > 0) {
        const newsStory = this.generateNewsStory(newsData);
        if (newsStory) {
          const created = await this.createStory(newsStory);
          if (created) generatedStories.push(created);
        }
      }

      // Generar story híbrido si hay suficiente contenido
      if (trendsData.length > 0 && newsData.length > 0) {
        const hybridStory = this.generateHybridStory(trendsData, newsData);
        if (hybridStory) {
          const created = await this.createStory(hybridStory);
          if (created) generatedStories.push(created);
        }
      }

      return generatedStories;
    } catch (error) {
      console.error('Error generating automatic stories:', error);
      return [];
    }
  }

  /**
   * Métodos privados para generación de contenido
   */
  private static async getRecentTrends(): Promise<TrendingData[]> {
    if (!supabaseAvailable()) return [];

    try {
      const { data } = await supabase
        .from('trends')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);

      return data || [];
    } catch (error) {
      console.error('Error fetching recent trends:', error);
      return [];
    }
  }

  private static async getRecentNews(): Promise<NewsItem[]> {
    if (!supabaseAvailable()) return [];

    try {
      const { data } = await supabase
        .from('news')
        .select('*')
        .order('date', { ascending: false })
        .limit(10);

      return data || [];
    } catch (error) {
      console.error('Error fetching recent news:', error);
      return [];
    }
  }

  private static generateTrendingStory(trends: TrendingData[]): Omit<Story, 'id' | 'view_count' | 'share_count' | 'created_at'> | null {
    if (trends.length === 0) return null;

    const latestTrend = trends[0];
    const topKeywords = latestTrend.top_keywords.slice(0, 3).map(k => k.keyword);
    
    return {
      title: '🔥 Trending Now',
      summary: `Lo más popular ahora: ${topKeywords.join(', ')}. ${latestTrend.statistics.total_procesados} temas analizados.`,
      background_color: '#ef4444',
      text_color: '#ffffff',
      gradient_colors: ['#ef4444', '#f97316'],
      category: 'trending',
      source_type: 'trend',
      source_ids: [latestTrend.id],
      priority: 5,
      is_active: true,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
      metadata: {
        emojis: ['🔥', '📈', '⚡'],
        layout_type: 'gradient',
        font_size: 'large'
      }
    };
  }

  private static generateNewsStory(news: NewsItem[]): Omit<Story, 'id' | 'view_count' | 'share_count' | 'created_at'> | null {
    if (news.length === 0) return null;

    const latestNews = news.slice(0, 2);
    const titles = latestNews.map(n => n.title).join(' | ');
    
    return {
      title: '📰 Breaking News',
      summary: `Últimas noticias: ${titles.substring(0, 150)}...`,
      background_color: '#3b82f6',
      text_color: '#ffffff',
      gradient_colors: ['#3b82f6', '#1d4ed8'],
      category: 'news',
      source_type: 'news',
      source_ids: latestNews.map(n => n.id),
      priority: 4,
      is_active: true,
      expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 horas
      metadata: {
        emojis: ['📰', '📢', '🌍'],
        layout_type: 'gradient',
        font_size: 'medium'
      }
    };
  }

  private static generateHybridStory(trends: TrendingData[], news: NewsItem[]): Omit<Story, 'id' | 'view_count' | 'share_count' | 'created_at'> | null {
    const topTrend = trends[0]?.top_keywords[0]?.keyword;
    const latestNews = news[0]?.title;
    
    if (!topTrend || !latestNews) return null;

    return {
      title: '💡 Daily Insights',
      summary: `Trending: "${topTrend}" | Breaking: "${latestNews.substring(0, 60)}..."`,
      background_color: '#8b5cf6',
      text_color: '#ffffff',
      gradient_colors: ['#8b5cf6', '#7c3aed'],
      category: 'insights',
      source_type: 'hybrid',
      source_ids: [trends[0].id, news[0].id],
      priority: 3,
      is_active: true,
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 horas
      metadata: {
        emojis: ['💡', '🔮', '✨'],
        layout_type: 'gradient',
        font_size: 'medium'
      }
    };
  }

  /**
   * Mock data para desarrollo
   */
  private static getMockStories(): Story[] {
    return [
      {
        id: '1',
        title: '🔥 Trending Now',
        summary: 'Guatemala, Política, Tecnología están en tendencia. 1,245 temas analizados.',
        background_color: '#ef4444',
        text_color: '#ffffff',
        gradient_colors: ['#ef4444', '#f97316'],
        category: 'trending',
        source_type: 'trend',
        source_ids: ['trend-1', 'trend-2'],
        priority: 5,
        is_active: true,
        view_count: 234,
        share_count: 12,
        created_at: new Date().toISOString(),
        metadata: {
          emojis: ['🔥', '📈'],
          layout_type: 'gradient',
          font_size: 'large'
        }
      },
      {
        id: '2',
        title: '📰 Breaking News',
        summary: 'Nuevos desarrollos en tecnología y política internacional. Mantente informado con las últimas actualizaciones.',
        background_color: '#3b82f6',
        text_color: '#ffffff',
        gradient_colors: ['#3b82f6', '#1d4ed8'],
        category: 'news',
        source_type: 'news',
        source_ids: ['news-1', 'news-2'],
        priority: 4,
        is_active: true,
        view_count: 189,
        share_count: 8,
        created_at: new Date().toISOString(),
        metadata: {
          emojis: ['📰', '🌍'],
          layout_type: 'gradient',
          font_size: 'medium'
        }
      },
      {
        id: '3',
        title: '💡 Daily Insights',
        summary: 'Análisis del día: Tendencias políticas se cruzan con avances tecnológicos.',
        background_color: '#8b5cf6',
        text_color: '#ffffff',
        gradient_colors: ['#8b5cf6', '#7c3aed'],
        category: 'insights',
        source_type: 'hybrid',
        source_ids: ['trend-1', 'news-3'],
        priority: 3,
        is_active: true,
        view_count: 156,
        share_count: 15,
        created_at: new Date().toISOString(),
        metadata: {
          emojis: ['💡', '🔮'],
          layout_type: 'gradient',
          font_size: 'medium'
        }
      }
    ];
  }
}
