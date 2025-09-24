import { supabase, supabaseAvailable } from '../config/supabase';
import { TrendingTweet, TweetStats, TweetFilters } from '../types/tweets';

export class TweetService {

  /**
   * Limpia texto de tweets similar a la implementación de la web app
   */
  private static cleanTweetText(text: string): string {
    if (!text) return '';
    return text
      .replace(/https?:\/\/[^\s]+/g, '') // Eliminar URLs
      .replace(/@\w+/g, (match) => match) // Mantener mentions pero limpiar
      .replace(/#\w+/g, (match) => match) // Mantener hashtags pero limpiar
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();
  }

  /**
   * Obtiene tweets con análisis de IA desde Supabase
   */
  static async getTweets(options: TweetFilters = {}): Promise<{
    data: TrendingTweet[];
    error: string | null;
  }> {
    if (!supabaseAvailable()) {
      // Datos de demo para cuando no hay conexión a Supabase
      return {
        data: this.getDemoTweets(),
        error: null
      };
    }

    try {
      const {
        categoria,
        sentimiento,
        limit = 50,
        forceRefresh = false
      } = options;

      let query = supabase
        .from('trending_tweets')
        .select(`
          id,
          trend_original,
          trend_clean,
          categoria,
          tweet_id,
          usuario,
          fecha_tweet,
          texto,
          enlace,
          likes,
          retweets,
          replies,
          verified,
          location,
          fecha_captura,
          raw_data,
          sentimiento,
          score_sentimiento,
          confianza_sentimiento,
          emociones_detectadas,
          intencion_comunicativa,
          propagacion_viral,
          score_propagacion,
          entidades_mencionadas,
          analisis_ai_metadata,
          created_at,
          updated_at
        `)
        .gte('fecha_captura', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('fecha_captura', { ascending: false })
        .limit(limit);

      // Aplicar filtros si se proporcionan
      if (categoria && categoria !== 'all') {
        query = query.eq('categoria', categoria);
      }

      if (sentimiento && sentimiento !== 'all') {
        query = query.eq('sentimiento', sentimiento);
      }

      // Solo obtener tweets que tengan análisis de IA
      query = query.not('sentimiento', 'is', null);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching tweets:', error);
        return {
          data: [],
          error: error.message
        };
      }

      // Limpiar texto de tweets antes de retornar
      const cleanedData = (data || []).map(tweet => ({
        ...tweet,
        texto: this.cleanTweetText(tweet.texto)
      }));

      return {
        data: cleanedData,
        error: null
      };

    } catch (error) {
      console.error('TweetService.getTweets error:', error);
      return {
        data: [],
        error: 'Error al obtener tweets'
      };
    }
  }

  /**
   * Obtiene estadísticas de tweets analizados
   */
  static async getTweetStats(): Promise<TweetStats> {
    if (!supabaseAvailable()) {
      return this.getDemoStats();
    }

    try {
      // Obtener conteo total de tweets con análisis
      const { count: totalTweets } = await supabase
        .from('trending_tweets')
        .select('*', { count: 'exact', head: true })
        .not('sentimiento', 'is', null);

      // Obtener estadísticas de sentimiento (últimas 24 horas)
      const { data: sentimentData } = await supabase
        .from('trending_tweets')
        .select('sentimiento')
        .gte('fecha_captura', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .not('sentimiento', 'is', null);

      // Obtener estadísticas de intención comunicativa (últimas 24 horas)
      const { data: intentionData } = await supabase
        .from('trending_tweets')
        .select('intencion_comunicativa')
        .gte('fecha_captura', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .not('intencion_comunicativa', 'is', null);

      // Obtener engagement promedio (últimas 24 horas)
      const { data: engagementData } = await supabase
        .from('trending_tweets')
        .select('likes, retweets, replies')
        .gte('fecha_captura', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .not('sentimiento', 'is', null);

      // Procesar estadísticas de sentimiento
      const sentimentCounts: Record<string, number> = {};
      sentimentData?.forEach(item => {
        if (item.sentimiento) {
          sentimentCounts[item.sentimiento] = (sentimentCounts[item.sentimiento] || 0) + 1;
        }
      });

      // Procesar estadísticas de intención
      const intentionCounts: Record<string, number> = {};
      intentionData?.forEach(item => {
        if (item.intencion_comunicativa) {
          intentionCounts[item.intencion_comunicativa] = (intentionCounts[item.intencion_comunicativa] || 0) + 1;
        }
      });

      // Calcular engagement promedio
      let avgEngagement = 0;
      if (engagementData && engagementData.length > 0) {
        const totalEngagement = engagementData.reduce((sum, tweet) => {
          return sum + (tweet.likes || 0) + (tweet.retweets || 0) + (tweet.replies || 0);
        }, 0);
        avgEngagement = Math.round(totalEngagement / engagementData.length);
      }

      return {
        totalTweets: totalTweets || 0,
        avgEngagement,
        sentimentCounts,
        intentionCounts,
        categoryStats: {} // Se calculará por separado si es necesario
      };

    } catch (error) {
      console.error('Error fetching tweet stats:', error);
      return this.getDemoStats();
    }
  }

  /**
   * Obtiene categorías disponibles con conteos
   */
  static async getTweetsByCategory(): Promise<Record<string, number>> {
    if (!supabaseAvailable()) {
      return {
        'Política': 25,
        'Sociales': 18,
        'Económica': 12,
        'General': 8
      };
    }

    try {
      const { data } = await supabase
        .from('trending_tweets')
        .select('categoria')
        .gte('fecha_captura', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .not('sentimiento', 'is', null);

      const categoryCounts: Record<string, number> = {};
      data?.forEach(item => {
        if (item.categoria) {
          categoryCounts[item.categoria] = (categoryCounts[item.categoria] || 0) + 1;
        }
      });

      return categoryCounts;

    } catch (error) {
      console.error('Error fetching category stats:', error);
      return {};
    }
  }

  /**
   * Obtiene tweets por categoría específica
   */
  static async getTweetsBySpecificCategory(
    categoria: string,
    limit: number = 20
  ): Promise<{ data: TrendingTweet[]; error: string | null }> {
    return this.getTweets({ categoria, limit });
  }

  /**
   * Busca tweets por texto
   */
  static async searchTweets(
    searchText: string,
    limit: number = 20
  ): Promise<{ data: TrendingTweet[]; error: string | null }> {
    if (!supabaseAvailable()) {
      return {
        data: this.getDemoTweets().slice(0, limit),
        error: null
      };
    }

    try {
      const { data, error } = await supabase
        .from('trending_tweets')
        .select('*')
        .textSearch('texto', searchText)
        .gte('fecha_captura', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .not('sentimiento', 'is', null)
        .order('fecha_captura', { ascending: false })
        .limit(limit);

      if (error) {
        return {
          data: [],
          error: error.message
        };
      }

      // Limpiar texto de tweets en resultados de búsqueda
      const cleanedData = (data || []).map(tweet => ({
        ...tweet,
        texto: this.cleanTweetText(tweet.texto)
      }));

      return {
        data: cleanedData,
        error: null
      };

    } catch (error) {
      console.error('Error searching tweets:', error);
      return {
        data: [],
        error: 'Error al buscar tweets'
      };
    }
  }

  /**
   * Datos de demostración cuando Supabase no está disponible
   */
  private static getDemoTweets(): TrendingTweet[] {
    return [
      {
        id: 1,
        trend_original: 'Guatemala',
        trend_clean: 'Guatemala',
        categoria: 'Política',
        tweet_id: 'demo_1',
        usuario: 'usuario_demo',
        fecha_tweet: new Date().toISOString(),
        texto: 'Este es un tweet de demostración sobre política en Guatemala con análisis de IA.',
        enlace: 'https://twitter.com/demo',
        likes: 125,
        retweets: 45,
        replies: 23,
        verified: false,
        location: 'Guatemala',
        fecha_captura: new Date().toISOString(),
        raw_data: {},
        sentimiento: 'neutral',
        score_sentimiento: 0.5,
        confianza_sentimiento: 0.8,
        emociones_detectadas: ['interés', 'preocupación'],
        intencion_comunicativa: 'informativo',
        propagacion_viral: 'medio_engagement',
        score_propagacion: 65,
        entidades_mencionadas: [
          { nombre: 'Guatemala', tipo: 'lugar' },
          { nombre: 'Gobierno', tipo: 'organizacion' }
        ],
        analisis_ai_metadata: {
          modelo: 'gpt-4',
          timestamp: new Date().toISOString(),
          contexto_local: 'Guatemala',
          intensidad: 'media',
          categoria: 'Política'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        trend_original: 'Economía',
        trend_clean: 'Economía',
        categoria: 'Económica',
        tweet_id: 'demo_2',
        usuario: 'economia_gt',
        fecha_tweet: new Date(Date.now() - 3600000).toISOString(),
        texto: 'Análisis económico muestra tendencias positivas en el sector de servicios guatemalteco. 📊',
        enlace: 'https://twitter.com/demo2',
        likes: 89,
        retweets: 34,
        replies: 12,
        verified: true,
        location: 'Guatemala',
        fecha_captura: new Date().toISOString(),
        raw_data: {},
        sentimiento: 'positivo',
        score_sentimiento: 0.7,
        confianza_sentimiento: 0.9,
        emociones_detectadas: ['optimismo', 'confianza'],
        intencion_comunicativa: 'informativo',
        propagacion_viral: 'medio_engagement',
        score_propagacion: 58,
        entidades_mencionadas: [
          { nombre: 'Guatemala', tipo: 'lugar' },
          { nombre: 'sector servicios', tipo: 'organizacion' }
        ],
        analisis_ai_metadata: {
          modelo: 'gpt-4',
          timestamp: new Date().toISOString(),
          contexto_local: 'Guatemala',
          intensidad: 'alta',
          categoria: 'Económica'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  private static getDemoStats(): TweetStats {
    return {
      totalTweets: 156,
      avgEngagement: 47,
      sentimentCounts: {
        'positivo': 52,
        'neutral': 68,
        'negativo': 36
      },
      intentionCounts: {
        'informativo': 89,
        'opinativo': 45,
        'critico': 22
      },
      categoryStats: {
        'Política': 45,
        'Sociales': 38,
        'Económica': 28,
        'General': 25,
        'Tecnología': 12,
        'Deportes': 8
      }
    };
  }
}