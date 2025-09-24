import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Linking,
  Share,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TrendingTweet,
  MobileTweetCardProps,
  CATEGORY_COLORS,
  SENTIMENT_COLORS
} from '../types/tweets';
import { textStyles } from '../utils/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MobileTweetCard: React.FC<MobileTweetCardProps> = ({
  tweet,
  layout = 'expanded',
  showActions = true,
  onLike,
  onRetweet,
  onShare,
  onPress
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isRetweeted, setIsRetweeted] = useState(false);
  const [localLikes, setLocalLikes] = useState(tweet.likes || 0);
  const [localRetweets, setLocalRetweets] = useState(tweet.retweets || 0);

  // Formatear fecha relativa
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Fecha no disponible';

    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'hace menos de 1h';
    if (diffInHours < 24) return `hace ${diffInHours}h`;
    if (diffInHours < 48) return 'hace 1 día';

    return new Intl.DateTimeFormat('es-ES', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Formatear números grandes
  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Obtener color de categoría
  const getCategoryColor = (categoria: string) => {
    return CATEGORY_COLORS[categoria as keyof typeof CATEGORY_COLORS] || '#9e9e9e';
  };

  // Obtener color de sentimiento
  const getSentimentColor = (sentimiento: string) => {
    return SENTIMENT_COLORS[sentimiento as keyof typeof SENTIMENT_COLORS] || '#9e9e9e';
  };

  // Manejar acciones
  const handleLike = () => {
    setIsLiked(!isLiked);
    setLocalLikes(prev => isLiked ? prev - 1 : prev + 1);
    onLike?.(tweet.tweet_id);
  };

  const handleRetweet = () => {
    setIsRetweeted(!isRetweeted);
    setLocalRetweets(prev => isRetweeted ? prev - 1 : prev + 1);
    onRetweet?.(tweet.tweet_id);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${tweet.texto}\n\nVía: @${tweet.usuario}`,
        url: tweet.enlace || undefined,
      });
      onShare?.(tweet.tweet_id);
    } catch (error) {
      console.error('Error sharing tweet:', error);
    }
  };

  const handleOpenOriginal = () => {
    if (tweet.enlace) {
      Linking.openURL(tweet.enlace);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    onPress?.(tweet);
  };

  // Determinar máximo de líneas según layout
  const getMaxLines = () => {
    if (isExpanded) return undefined;
    switch (layout) {
      case 'compact': return 2;
      case 'expanded': return 4;
      case 'full': return undefined;
      default: return 4;
    }
  };

  // Determinar si mostrar "Ver más"
  const shouldShowExpandButton = () => {
    const maxLength = layout === 'compact' ? 100 : layout === 'expanded' ? 200 : 500;
    return tweet.texto.length > maxLength && !isExpanded;
  };

  return (
    <Pressable
      onPress={layout !== 'full' ? toggleExpanded : undefined}
      className={`bg-white rounded-2xl p-4 mb-3 border border-gray-200 ${
        layout === 'compact' ? 'min-h-[140px]' : 'min-h-[200px]'
      }`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* Barra de color de categoría */}
      <View
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ backgroundColor: getCategoryColor(tweet.categoria) }}
      />

      {/* Header con usuario y metadata */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3`}
                style={{ backgroundColor: getSentimentColor(tweet.sentimiento) + '20' }}>
            <Text className="text-xs font-bold" style={{ color: getSentimentColor(tweet.sentimiento) }}>
              @
            </Text>
          </View>

          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className={`${textStyles.bodyText} font-semibold`} numberOfLines={1}>
                @{tweet.usuario}
              </Text>
              {tweet.verified && (
                <Ionicons name="checkmark-circle" size={16} color="#1da1f2" style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text className={`${textStyles.helper} text-gray-500`}>
              {formatDate(tweet.fecha_tweet)}
            </Text>
          </View>
        </View>

        {/* Badge de categoría */}
        <View
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: getCategoryColor(tweet.categoria) + '15' }}
        >
          <Text
            className="text-xs font-medium"
            style={{ color: getCategoryColor(tweet.categoria) }}
          >
            {tweet.categoria}
          </Text>
        </View>
      </View>

      {/* Contenido del tweet */}
      <Text
        className={`${layout === 'compact' ? textStyles.helper : textStyles.bodyText} text-gray-800 mb-3 leading-relaxed`}
        numberOfLines={getMaxLines()}
      >
        {tweet.texto}
      </Text>

      {/* Botón "Ver más" */}
      {shouldShowExpandButton() && (
        <Pressable onPress={toggleExpanded} className="mb-2">
          <Text className="text-blue-500 text-sm font-medium">Ver más</Text>
        </Pressable>
      )}

      {/* Trend relacionado */}
      {layout !== 'compact' && (
        <View className="mb-3">
          <Text className={`${textStyles.helper} text-gray-500`}>
            Trending: {tweet.trend_clean}
          </Text>
        </View>
      )}

      {/* Análisis de IA (solo en expanded y full) */}
      {layout !== 'compact' && isExpanded && (
        <View className="mb-3 p-3 bg-gray-50 rounded-xl">
          <Text className="text-sm font-medium text-gray-700 mb-2">Análisis IA</Text>
          <View className="space-y-2">
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-gray-600">Sentimiento:</Text>
              <View
                className="px-2 py-1 rounded-full"
                style={{ backgroundColor: getSentimentColor(tweet.sentimiento) + '20' }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: getSentimentColor(tweet.sentimiento) }}
                >
                  {tweet.sentimiento} ({Math.round(tweet.score_sentimiento * 100)}%)
                </Text>
              </View>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-gray-600">Intención:</Text>
              <Text className="text-xs font-medium text-gray-800">
                {tweet.intencion_comunicativa}
              </Text>
            </View>

            {tweet.entidades_mencionadas && tweet.entidades_mencionadas.length > 0 && (
              <View>
                <Text className="text-xs text-gray-600 mb-1">Entidades:</Text>
                <View className="flex-row flex-wrap gap-1">
                  {tweet.entidades_mencionadas.slice(0, 3).map((entidad, index) => (
                    <View key={index} className="px-2 py-1 bg-blue-100 rounded-md">
                      <Text className="text-xs text-blue-700">
                        {entidad.nombre}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Métricas de engagement */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center space-x-4">
          {/* Likes */}
          <Pressable
            onPress={showActions ? handleLike : undefined}
            className="flex-row items-center"
            disabled={!showActions}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={layout === 'compact' ? 16 : 18}
              color={isLiked ? "#e91e63" : "#666"}
            />
            <Text className={`ml-1 ${textStyles.helper} ${isLiked ? 'font-medium' : ''}`}>
              {formatNumber(localLikes)}
            </Text>
          </Pressable>

          {/* Retweets */}
          <Pressable
            onPress={showActions ? handleRetweet : undefined}
            className="flex-row items-center"
            disabled={!showActions}
          >
            <Ionicons
              name="repeat"
              size={layout === 'compact' ? 16 : 18}
              color={isRetweeted ? "#4caf50" : "#666"}
            />
            <Text className={`ml-1 ${textStyles.helper} ${isRetweeted ? 'font-medium' : ''}`}>
              {formatNumber(localRetweets)}
            </Text>
          </Pressable>

          {/* Replies */}
          <View className="flex-row items-center">
            <Ionicons
              name="chatbubble-outline"
              size={layout === 'compact' ? 16 : 18}
              color="#2196f3"
            />
            <Text className={`ml-1 ${textStyles.helper}`}>
              {formatNumber(tweet.replies)}
            </Text>
          </View>
        </View>

        {/* Acciones */}
        {showActions && layout !== 'compact' && (
          <View className="flex-row items-center space-x-2">
            <Pressable onPress={handleShare} className="p-2">
              <Ionicons name="share-outline" size={18} color="#666" />
            </Pressable>

            {tweet.enlace && (
              <Pressable onPress={handleOpenOriginal} className="p-2">
                <Ionicons name="open-outline" size={18} color="#1da1f2" />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Footer con fecha de captura */}
      <View className="flex-row justify-between items-center">
        <Text className={`${textStyles.helper} text-gray-400`}>
          Capturado: {formatDate(tweet.fecha_captura)}
        </Text>

        {layout !== 'compact' && (
          <View className="flex-row items-center">
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color="#9CA3AF"
            />
          </View>
        )}
      </View>
    </Pressable>
  );
};

export default React.memo(MobileTweetCard);