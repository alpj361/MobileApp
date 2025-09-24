import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MobileTweetCard from './MobileTweetCard';
import {
  TrendingTweet,
  TweetLayoutType,
  TweetSortType,
  TWEET_CATEGORIES,
  TWEET_SENTIMENTS,
  SENTIMENT_COLORS
} from '../types/tweets';
import { TweetService } from '../services/tweetService';
import { textStyles } from '../utils/typography';

interface MobileTweetsSectionProps {
  onTweetPress?: (tweet: TrendingTweet) => void;
}

const MobileTweetsSection: React.FC<MobileTweetsSectionProps> = ({
  onTweetPress
}) => {
  // Estados principales
  const [tweets, setTweets] = useState<TrendingTweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de filtros y configuración
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSentiment, setSelectedSentiment] = useState('all');
  const [layout, setLayout] = useState<TweetLayoutType>('expanded');
  const [sortBy, setSortBy] = useState<TweetSortType>('date');

  // Estados de estadísticas
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});
  const [totalTweets, setTotalTweets] = useState(0);

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);

  // Recargar cuando cambien los filtros
  useEffect(() => {
    if (categories.length > 0) {
      loadTweets();
    }
  }, [selectedCategory, selectedSentiment, sortBy]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar tweets y estadísticas en paralelo
      const [tweetsResult, categoryStatsResult, statsResult] = await Promise.all([
        TweetService.getTweets({ limit: 50 }),
        TweetService.getTweetsByCategory(),
        TweetService.getTweetStats()
      ]);

      if (tweetsResult.error) {
        setError(tweetsResult.error);
      } else {
        setTweets(sortTweets(tweetsResult.data, sortBy));
      }

      // Configurar categorías disponibles
      const availableCategories = Object.keys(categoryStatsResult);
      setCategories(['all', ...availableCategories]);
      setCategoryStats(categoryStatsResult);
      setTotalTweets(statsResult.totalTweets);

    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const loadTweets = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      }

      const filters = {
        categoria: selectedCategory === 'all' ? undefined : selectedCategory,
        sentimiento: selectedSentiment === 'all' ? undefined : selectedSentiment,
        limit: 50,
        forceRefresh
      };

      const result = await TweetService.getTweets(filters);

      if (result.error) {
        setError(result.error);
      } else {
        const sortedTweets = sortTweets(result.data, sortBy);
        setTweets(sortedTweets);
        setError(null);
      }

    } catch (err) {
      console.error('Error loading tweets:', err);
      setError('Error al cargar tweets');
    } finally {
      if (forceRefresh) {
        setRefreshing(false);
      }
    }
  };

  const sortTweets = useCallback((tweets: TrendingTweet[], sortType: TweetSortType): TrendingTweet[] => {
    return [...tweets].sort((a, b) => {
      switch (sortType) {
        case 'likes':
          return (b.likes || 0) - (a.likes || 0);
        case 'retweets':
          return (b.retweets || 0) - (a.retweets || 0);
        case 'engagement':
          const aEngagement = (a.likes || 0) + (a.retweets || 0) + (a.replies || 0);
          const bEngagement = (b.likes || 0) + (b.retweets || 0) + (b.replies || 0);
          return bEngagement - aEngagement;
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, []);

  const handleRefresh = useCallback(() => {
    loadTweets(true);
  }, [selectedCategory, selectedSentiment, sortBy]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const handleSentimentChange = (sentiment: string) => {
    setSelectedSentiment(sentiment);
  };

  const handleLayoutChange = (newLayout: TweetLayoutType) => {
    setLayout(newLayout);
  };

  const handleSortChange = (newSort: TweetSortType) => {
    setSortBy(newSort);
    // Optimized sorting - avoid unnecessary re-renders
    setTweets(prevTweets => sortTweets(prevTweets, newSort));
  };

  const handleTweetAction = (action: string, tweetId: string) => {
    console.log(`Tweet ${action}:`, tweetId);
    // Aquí se pueden implementar acciones específicas como analytics
  };

  // Renderizar filtro de categorías
  const renderCategoryFilter = useCallback(() => (
    <View className="mb-4">
      <Text className={`${textStyles.bodyText} font-medium mb-3 text-gray-700`}>
        Categorías
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row items-center gap-2 px-1">
          {categories.map((category) => {
            const isSelected = selectedCategory === category;
            const count = category === 'all' ? totalTweets : categoryStats[category] || 0;
            const displayName = category === 'all' ? 'Todas' : TWEET_CATEGORIES[category as keyof typeof TWEET_CATEGORIES] || category;

            return (
              <Pressable
                key={category}
                onPress={() => handleCategoryChange(category)}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  isSelected ? 'bg-blue-500' : 'bg-white border border-gray-200'
                }`}
              >
                <Text className={`text-sm ${
                  isSelected ? 'text-white font-medium' : 'text-gray-700'
                }`}>
                  {displayName} ({count})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  ), [categories, selectedCategory, categoryStats]);

  // Renderizar filtro de sentimientos
  const renderSentimentFilter = useCallback(() => (
    <View className="mb-4">
      <Text className={`${textStyles.bodyText} font-medium mb-3 text-gray-700`}>
        Sentimiento
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row items-center gap-2 px-1">
          {Object.entries(TWEET_SENTIMENTS).map(([key, label]) => {
            const isSelected = selectedSentiment === key;
            const color = key === 'all' ? '#6b7280' : SENTIMENT_COLORS[key as keyof typeof SENTIMENT_COLORS];

            return (
              <Pressable
                key={key}
                onPress={() => handleSentimentChange(key)}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  isSelected ? 'border-2' : 'bg-white border border-gray-200'
                }`}
                style={{
                  backgroundColor: isSelected ? color + '15' : 'white',
                  borderColor: isSelected ? color : '#e5e7eb'
                }}
              >
                <View
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: color }}
                />
                <Text className={`text-sm ${
                  isSelected ? 'font-medium' : ''
                }`} style={{ color: isSelected ? color : '#374151' }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  ), [selectedSentiment]);

  // Renderizar controles de layout y ordenamiento
  const renderControls = useCallback(() => (
    <View className="mb-4">
      <View className="flex-row justify-between items-center">
        {/* Controles de Layout */}
        <View>
          <Text className={`${textStyles.helper} text-gray-600 mb-2`}>Diseño</Text>
          <View className="flex-row bg-gray-100 rounded-xl p-1">
            {(['compact', 'expanded', 'full'] as TweetLayoutType[]).map((layoutType) => {
              const isSelected = layout === layoutType;
              const iconName = layoutType === 'compact' ? 'grid' :
                             layoutType === 'expanded' ? 'list' : 'reader';

              return (
                <Pressable
                  key={layoutType}
                  onPress={() => handleLayoutChange(layoutType)}
                  className={`p-2 rounded-lg ${isSelected ? 'bg-white' : ''}`}
                >
                  <Ionicons
                    name={iconName as any}
                    size={18}
                    color={isSelected ? '#3b82f6' : '#6b7280'}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Controles de Ordenamiento */}
        <View>
          <Text className={`${textStyles.helper} text-gray-600 mb-2`}>Ordenar</Text>
          <View className="flex-row bg-gray-100 rounded-xl p-1">
            {(['date', 'likes', 'retweets', 'engagement'] as TweetSortType[]).map((sortType) => {
              const isSelected = sortBy === sortType;
              const iconName = sortType === 'date' ? 'time' :
                             sortType === 'likes' ? 'heart' :
                             sortType === 'retweets' ? 'repeat' : 'trending-up';

              return (
                <Pressable
                  key={sortType}
                  onPress={() => handleSortChange(sortType)}
                  className={`p-2 rounded-lg ${isSelected ? 'bg-white' : ''}`}
                >
                  <Ionicons
                    name={iconName as any}
                    size={18}
                    color={isSelected ? '#3b82f6' : '#6b7280'}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  ), [layout, sortBy]);

  // Renderizar estadísticas
  const renderStats = useCallback(() => (
    <View className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
      <View className="flex-row items-center justify-between">
        <Text className={`${textStyles.description} text-blue-800`}>
          {tweets.length} tweet{tweets.length !== 1 ? 's' : ''} con análisis IA
        </Text>
        <View className="flex-row items-center">
          <Ionicons name="analytics" size={14} color="#1e40af" />
          <Text className={`${textStyles.helper} text-blue-600 ml-1`}>
            Análisis en tiempo real
          </Text>
        </View>
      </View>
    </View>
  ), [tweets.length, totalTweets]);

  const renderTweetItem = useCallback(({ item }: { item: TrendingTweet }) => (
    <MobileTweetCard
      tweet={item}
      layout={layout}
      showActions={true}
      onLike={(tweetId) => handleTweetAction('like', tweetId)}
      onRetweet={(tweetId) => handleTweetAction('retweet', tweetId)}
      onShare={(tweetId) => handleTweetAction('share', tweetId)}
      onPress={onTweetPress}
    />
  ), [layout, onTweetPress]);

  const renderEmptyState = useCallback(() => (
    <View className="items-center justify-center py-16">
      <View className="w-20 h-20 bg-gray-200 rounded-full items-center justify-center mb-4">
        <Ionicons name="chatbubble-ellipses-outline" size={32} color="#9CA3AF" />
      </View>
      <Text className="text-black text-lg font-medium mb-2">No hay tweets</Text>
      <Text className="text-gray-500 text-center px-8">
        {selectedCategory === 'all' && selectedSentiment === 'all'
          ? 'No se encontraron tweets con análisis IA'
          : 'No hay tweets para los filtros seleccionados'
        }
      </Text>
    </View>
  ), [selectedCategory, selectedSentiment]);

  const renderErrorState = useCallback(() => (
    <View className="items-center justify-center py-16">
      <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-4">
        <Ionicons name="alert-circle-outline" size={32} color="#ef4444" />
      </View>
      <Text className="text-black text-lg font-medium mb-2">Error al cargar</Text>
      <Text className="text-gray-500 text-center px-8 mb-4">{error}</Text>
      <Pressable
        onPress={() => loadInitialData()}
        className="bg-blue-500 px-6 py-2 rounded-lg"
      >
        <Text className="text-white font-medium">Reintentar</Text>
      </Pressable>
    </View>
  ), [error, loadInitialData]);

  const renderLoadingState = useCallback(() => (
    <View className="items-center justify-center py-16">
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text className={`${textStyles.helper} text-gray-500 mt-4`}>
        Cargando tweets...
      </Text>
    </View>
  ), []);

  // Memoized filtered and sorted data - Always call hooks before conditional returns
  const processedTweets = useMemo(() => tweets, [tweets]);
  const headerComponent = useMemo(() => (
    <View>
      {renderStats()}
      {renderCategoryFilter()}
      {renderSentimentFilter()}
      {renderControls()}
    </View>
  ), [tweets.length, selectedCategory, selectedSentiment, layout, sortBy, categories, categoryStats, totalTweets]);

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 px-4 pt-4">
        {renderLoadingState()}
      </View>
    );
  }

  if (error && tweets.length === 0) {
    return (
      <View className="flex-1 bg-gray-50 px-4 pt-4">
        {renderErrorState()}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={processedTweets}
        renderItem={renderTweetItem}
        keyExtractor={(item) => `tweet-${item.tweet_id}-${item.id}`}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={headerComponent}
        ListEmptyComponent={renderEmptyState()}
        ItemSeparatorComponent={null}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={5}
        getItemLayout={(data, index) => ({
          length: layout === 'compact' ? 160 : layout === 'expanded' ? 220 : 300,
          offset: (layout === 'compact' ? 160 : layout === 'expanded' ? 220 : 300) * index,
          index,
        })}
      />
    </View>
  );
};

export default MobileTweetsSection;