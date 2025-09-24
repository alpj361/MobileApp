export interface TrendingTweet {
  id: number;
  trend_original: string;
  trend_clean: string;
  categoria: 'Política' | 'Económica' | 'Sociales' | 'General';
  tweet_id: string;
  usuario: string;
  fecha_tweet: string | null;
  texto: string;
  enlace: string | null;
  likes: number;
  retweets: number;
  replies: number;
  verified: boolean;
  location: string;
  fecha_captura: string;
  raw_data: any;
  sentimiento: 'positivo' | 'negativo' | 'neutral';
  score_sentimiento: number;
  confianza_sentimiento: number;
  emociones_detectadas: string[];
  // Campos de análisis avanzado
  intencion_comunicativa: 'informativo' | 'opinativo' | 'humoristico' | 'alarmista' | 'critico' | 'promocional' | 'conversacional' | 'protesta';
  propagacion_viral: 'viral' | 'alto_engagement' | 'medio_engagement' | 'bajo_engagement' | 'sin_engagement';
  score_propagacion: number;
  entidades_mencionadas: Array<{
    nombre: string;
    tipo: 'persona' | 'organizacion' | 'lugar' | 'evento';
    contexto?: string;
  }>;
  analisis_ai_metadata: {
    modelo?: string;
    timestamp?: string;
    contexto_local?: string;
    intensidad?: 'alta' | 'media' | 'baja';
    categoria?: string;
    tokens_usados?: number;
    costo_estimado?: number;
    error?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface TweetStats {
  totalTweets: number;
  avgEngagement: number;
  sentimentCounts: Record<string, number>;
  intentionCounts: Record<string, number>;
  categoryStats: Record<string, number>;
}

export type TweetLayoutType = 'compact' | 'expanded' | 'full';
export type TweetSortType = 'date' | 'likes' | 'retweets' | 'engagement';

export interface TweetFilters {
  categoria?: string;
  sentimiento?: string;
  limit?: number;
  forceRefresh?: boolean;
}

export interface TweetState {
  data: TrendingTweet[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  hasMore: boolean;
}

export interface TweetEngagement {
  likes: number;
  retweets: number;
  replies: number;
  total: number;
}

export interface TweetAnalysis {
  sentimiento: 'positivo' | 'negativo' | 'neutral';
  score: number;
  confianza: number;
  intencion: string;
  intensidad: 'alta' | 'media' | 'baja';
  entidades: string[];
}

// Tipos específicos para componentes móviles
export interface MobileTweetCardProps {
  tweet: TrendingTweet;
  layout?: TweetLayoutType;
  showActions?: boolean;
  onLike?: (tweetId: string) => void;
  onRetweet?: (tweetId: string) => void;
  onShare?: (tweetId: string) => void;
  onPress?: (tweet: TrendingTweet) => void;
}

export interface MobileTweetsSectionProps {
  data: TrendingTweet[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  categories: string[];
  selectedCategory: string;
  selectedSentiment: string;
  layout: TweetLayoutType;
  sortBy: TweetSortType;
  onCategoryChange: (category: string) => void;
  onSentimentChange: (sentiment: string) => void;
  onLayoutChange: (layout: TweetLayoutType) => void;
  onSortChange: (sort: TweetSortType) => void;
  onRefresh: () => void;
  onLoadMore?: () => void;
}

// Constantes para la UI móvil
export const TWEET_CATEGORIES = {
  'all': 'Todas',
  'Política': 'Política',
  'Económica': 'Económica',
  'Sociales': 'Sociales',
  'General': 'General',
  'Tecnología': 'Tecnología',
  'Deportes': 'Deportes'
} as const;

export const TWEET_SENTIMENTS = {
  'all': 'Todos',
  'positivo': 'Positivo',
  'negativo': 'Negativo',
  'neutral': 'Neutral'
} as const;

export const TWEET_INTENTIONS = {
  'informativo': 'Informativo',
  'opinativo': 'Opinativo',
  'humoristico': 'Humorístico',
  'alarmista': 'Alarmista',
  'critico': 'Crítico',
  'promocional': 'Promocional',
  'conversacional': 'Conversacional',
  'protesta': 'Protesta'
} as const;

// Configuración de colores para categorías y sentimientos
export const CATEGORY_COLORS = {
  'Política': '#9c27b0',
  'Económica': '#4caf50',
  'Sociales': '#2196f3',
  'General': '#9e9e9e',
  'Tecnología': '#ff9800',
  'Deportes': '#8bc34a'
} as const;

export const SENTIMENT_COLORS = {
  'positivo': '#4caf50',
  'negativo': '#f44336',
  'neutral': '#ff9800'
} as const;