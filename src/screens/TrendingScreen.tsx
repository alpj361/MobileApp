import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Pressable, 
  RefreshControl,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../components/CustomHeader';
import TrendingLoading from '../components/TrendingLoading';
import NewsCard from '../components/NewsCard';
import FullScreenStoriesDisplay from '../components/FullScreenStoriesDisplay';
import MobileTweetsSection from '../components/MobileTweetsSection';
import { TrendingService } from '../services/trendingService';
import { NewsService } from '../services/newsService';
import { TrendingData, NewsItem } from '../config/supabase';
import { supabaseAvailable } from '../config/supabase';
import { textStyles } from '../utils/typography';

type TabType = 'stories' | 'trending' | 'news' | 'tweets';

interface TrendingItem {
  id: string;
  title: string;
  category: string;
  engagement: string;
  trend: 'up' | 'down' | 'stable';
  rank: number;
  description: string;
  isLocal: boolean;
  relevance: 'alta' | 'media' | 'baja';
  date: string;
}

interface TrendingCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function TrendingScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('trending');
  
  // Trending state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshingTrending, setRefreshingTrending] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [trendingData, setTrendingData] = useState<TrendingData[]>([]);
  const [categories, setCategories] = useState<TrendingCategory[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [trendingStats, setTrendingStats] = useState<{
    totalTrends: number;
    localTrends: number;
    globalTrends: number;
    highRelevance: number;
  } | null>(null);

  // News state
  const [refreshingNews, setRefreshingNews] = useState(false);
  const [loadingNews, setLoadingNews] = useState(true);
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [newsCategories, setNewsCategories] = useState<string[]>([]);
  const [selectedNewsCategory, setSelectedNewsCategory] = useState('all');
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsStats, setNewsStats] = useState<{
    totalNews: number;
    categoriesCount: number;
    recentNews: number;
    sourcesCount: number;
  } | null>(null);


  // Mapeo de categorías a iconos y colores para trending
  const categoryMapping: { [key: string]: { icon: string; color: string } } = {
    'Deportes': { icon: 'football', color: '#10B981' },
    'Música': { icon: 'musical-notes', color: '#8B5CF6' },
    'Política': { icon: 'business', color: '#EF4444' },
    'Economía': { icon: 'trending-up', color: '#F59E0B' },
    'Entretenimiento': { icon: 'film', color: '#EC4899' },
    'Social': { icon: 'people', color: '#3B82F6' },
    'Otros': { icon: 'apps', color: '#6B7280' },
    'Internacional': { icon: 'globe', color: '#6366F1' },
  };

  // Cargar datos iniciales
  useEffect(() => {
    if (activeTab === 'trending') {
      loadInitialTrendingData();
    } else if (activeTab === 'news') {
      loadInitialNewsData();
    }
    // Stories y Tweets se cargan automáticamente en sus componentes
  }, [activeTab]);

  // TRENDING FUNCTIONS
  const loadInitialTrendingData = async () => {
    try {
      setLoadingTrending(true);
      await loadTrends();
      
      const availableCategories = await TrendingService.getAvailableCategories();
      let derived: string[] = availableCategories;
      if (!derived || derived.length === 0) {
        const latest = await TrendingService.getLatestTrends(15);
        const setCats = new Set<string>();
        (latest.data || []).forEach(t => {
          t.category_data?.forEach(c => c.name && setCats.add(c.name));
          t.top_keywords?.forEach(k => k.category && setCats.add(k.category));
        });
        derived = Array.from(setCats);
        if (derived.length === 0) {
          derived = ['Social', 'Noticias', 'Tech', 'AI', 'Otros'];
        }
      }
      
      const categoryList: TrendingCategory[] = [
        { id: 'all', name: 'Todos', icon: 'apps', color: '#6B7280' },
        ...derived.map(cat => ({
          id: cat,
          name: cat,
          icon: categoryMapping[cat]?.icon || 'apps',
          color: categoryMapping[cat]?.color || '#6B7280'
        }))
      ];
      setCategories(categoryList);
      
      const trendingStatsData = await TrendingService.getTrendingStats();
      setTrendingStats(trendingStatsData);
      
    } catch (error) {
      console.error('Error loading trending data:', error);
      setTrendingError('No se pudieron cargar los datos de trending');
    } finally {
      setLoadingTrending(false);
    }
  };

  const loadTrends = async () => {
    try {
      let response;
      if (selectedCategory === 'all') {
        response = await TrendingService.getLatestTrends(15);
      } else {
        response = await TrendingService.getTrendsByCategory(selectedCategory, 15);
      }

      if (response.error) {
        throw response.error;
      }

      setTrendingData(response.data || []);
    } catch (error) {
      console.error('Error loading trends:', error);
      setTrendingError('No se pudieron cargar las tendencias');
    }
  };

  const handleTrendingRefresh = async () => {
    setRefreshingTrending(true);
    await loadTrends();
    setRefreshingTrending(false);
  };

  const handleTrendingCategoryChange = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    setLoadingTrending(true);
    await loadTrends();
    setLoadingTrending(false);
  };

  // NEWS FUNCTIONS
  const loadInitialNewsData = async () => {
    try {
      setLoadingNews(true);
      await loadNews();
      
      const availableNewsCategories = await NewsService.getAvailableCategories();
      setNewsCategories(['all', ...availableNewsCategories]);
      
      const newsStatsData = await NewsService.getNewsStats();
      setNewsStats(newsStatsData);
      
    } catch (error) {
      console.error('Error loading news data:', error);
      setNewsError('No se pudieron cargar las noticias');
    } finally {
      setLoadingNews(false);
    }
  };

  const loadNews = async () => {
    try {
      let response;
      if (selectedNewsCategory === 'all') {
        response = await NewsService.getLatestNews(20);
      } else {
        response = await NewsService.getNewsByCategory(selectedNewsCategory, 20);
      }

      if (response.error) {
        throw new Error(response.error);
      }

      setNewsData(response.data || []);
    } catch (error) {
      console.error('Error loading news:', error);
      setNewsError('No se pudieron cargar las noticias');
    }
  };

  const handleNewsRefresh = async () => {
    setRefreshingNews(true);
    await loadNews();
    setRefreshingNews(false);
  };

  const handleNewsCategoryChange = async (categoryId: string) => {
    setSelectedNewsCategory(categoryId);
    setLoadingNews(true);
    await loadNews();
    setLoadingNews(false);
  };


  // TRENDING HELPER FUNCTIONS
  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const transformTrendingData = (): TrendingItem[] => {
    const items: TrendingItem[] = [];
    let rank = 1;

    trendingData.forEach(trend => {
      trend.top_keywords?.forEach(keyword => {
        items.push({
          id: `${trend.id}-${keyword.keyword}`,
          title: keyword.keyword,
          category: keyword.category,
          engagement: `${keyword.count.toLocaleString()} menciones`,
          trend: 'up' as const,
          rank: rank++,
          description: keyword.about.razon_tendencia,
          isLocal: keyword.about.contexto_local,
          relevance: keyword.about.relevancia,
          date: keyword.about.fecha_evento
        });
      });
    });

    return items.slice(0, 15);
  };

  const getRelevanceColor = (relevance: string) => {
    switch (relevance) {
      case 'alta':
        return '#EF4444';
      case 'media':
        return '#F59E0B';
      case 'baja':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  // RENDER FUNCTIONS
  const renderTabButton = (tab: TabType, title: string, icon: string) => (
    <Pressable
      key={tab}
      onPress={() => setActiveTab(tab)}
      className={`flex-1 flex-row items-center justify-center py-4 px-3 mx-1 rounded-xl ${
        activeTab === tab ? 'bg-blue-50 border border-blue-200' : 'active:bg-gray-50'
      }`}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={activeTab === tab ? '#3B82F6' : '#9CA3AF'} 
      />
      <Text className={`ml-2 ${textStyles.tabLabel} ${
        activeTab === tab ? 'text-blue-600' : 'text-gray-500'
      }`}>
        {title}
      </Text>
    </Pressable>
  );

  const renderTrendingCategoryButton = (category: TrendingCategory) => (
    <Pressable
      key={category.id}
      onPress={() => handleTrendingCategoryChange(category.id)}
      className={`px-3 py-2 rounded-full mr-3 flex-row items-center ${
        selectedCategory === category.id ? 'bg-blue-500' : 'bg-white border border-gray-200'
      }`}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Ionicons 
        name={category.icon as any} 
        size={14} 
        color={selectedCategory === category.id ? 'white' : category.color} 
      />
      <Text className={`ml-1.5 text-sm ${
        selectedCategory === category.id ? 'text-white font-medium' : 'text-gray-700'
      }`} numberOfLines={1}>
        {category.name}
      </Text>
    </Pressable>
  );

  const renderNewsCategoryButton = (category: string) => (
    <Pressable
      key={category}
      onPress={() => handleNewsCategoryChange(category)}
      className={`px-3 py-2 rounded-full mr-3 ${
        selectedNewsCategory === category ? 'bg-blue-500' : 'bg-white border border-gray-200'
      }`}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Text className={`text-sm ${
        selectedNewsCategory === category ? 'text-white font-medium' : 'text-gray-700'
      }`} numberOfLines={1}>
        {category === 'all' ? 'Todas' : category}
      </Text>
    </Pressable>
  );

  const renderTrendingItem = ({ item }: { item: TrendingItem }) => {
    const categoryInfo = categories.find(c => c.id === item.category);
    const isExpanded = expandedItems.has(item.id);
    
    return (
      <Pressable 
        className="bg-white rounded-2xl p-4 mb-3 border border-gray-200 active:bg-gray-50"
        onPress={() => toggleItemExpansion(item.id)}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1">
            <View className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center mr-3">
              <Text className="text-gray-600 font-bold text-sm">#{item.rank}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-black font-semibold text-base" numberOfLines={1}>
                {item.title}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center ml-2">
            {item.isLocal && (
              <View className="mr-2 px-2 py-1 bg-green-100 rounded-full">
                <Text className="text-green-700 text-xs font-medium">Local</Text>
              </View>
            )}
            <Ionicons 
              name="trending-up" 
              size={18} 
              color={getRelevanceColor(item.relevance)} 
            />
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#9CA3AF" 
              style={{ marginLeft: 6 }}
            />
          </View>
        </View>
        
        <Text className="text-gray-600 text-sm mb-2" numberOfLines={isExpanded ? undefined : 2}>
          {item.description}
        </Text>
        
        {isExpanded && (
          <View className="mt-3 p-3 bg-gray-50 rounded-xl">
            <Text className="text-gray-700 font-medium text-sm mb-2">Detalles del Trend</Text>
            <View className="space-y-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600 text-sm">Relevancia:</Text>
                <View className={`px-2 py-1 rounded-full ${
                  item.relevance === 'alta' ? 'bg-red-100' :
                  item.relevance === 'media' ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                  <Text className={`text-xs font-medium ${
                    item.relevance === 'alta' ? 'text-red-700' :
                    item.relevance === 'media' ? 'text-yellow-700' : 'text-gray-700'
                  }`}>
                    {item.relevance.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600 text-sm">Contexto:</Text>
                <Text className="text-gray-800 text-sm font-medium">
                  {item.isLocal ? 'Local' : 'Global'}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600 text-sm">Fecha evento:</Text>
                <Text className="text-gray-800 text-sm">{item.date}</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600 text-sm">Categoría:</Text>
                <Text className="text-gray-800 text-sm font-medium">{item.category}</Text>
              </View>
            </View>
          </View>
        )}
        
        <View className="flex-row items-center justify-between mt-3">
          <View className="flex-row items-center flex-1">
            <Text className="text-gray-500 text-sm">
              {item.engagement}
            </Text>
            <Text className="text-gray-400 text-xs ml-2">
              {item.date}
            </Text>
          </View>
          <View className={`px-2 py-1 rounded-full ml-2 ${
            categoryInfo?.color === '#10B981' ? 'bg-green-100' :
            categoryInfo?.color === '#8B5CF6' ? 'bg-purple-100' :
            categoryInfo?.color === '#F59E0B' ? 'bg-yellow-100' :
            categoryInfo?.color === '#EF4444' ? 'bg-red-100' :
            categoryInfo?.color === '#EC4899' ? 'bg-pink-100' :
            categoryInfo?.color === '#3B82F6' ? 'bg-blue-100' :
            categoryInfo?.color === '#6366F1' ? 'bg-indigo-100' :
            'bg-gray-100'
          }`}>
            <Text className={`text-xs font-medium ${
              categoryInfo?.color === '#10B981' ? 'text-green-700' :
              categoryInfo?.color === '#8B5CF6' ? 'text-purple-700' :
              categoryInfo?.color === '#F59E0B' ? 'text-yellow-700' :
              categoryInfo?.color === '#EF4444' ? 'text-red-700' :
              categoryInfo?.color === '#EC4899' ? 'text-pink-700' :
              categoryInfo?.color === '#3B82F6' ? 'text-blue-700' :
              categoryInfo?.color === '#6366F1' ? 'text-indigo-700' :
              'text-gray-700'
            }`}>
              {item.category}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const isLoading = activeTab === 'trending' ? loadingTrending :
                   activeTab === 'news' ? loadingNews : false;

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-100">
        <CustomHeader navigation={navigation} title="Trending & News" />
        <TrendingLoading />
      </View>
    );
  }

  const transformedTrendingData = transformTrendingData();

  return (
    <View className="flex-1 bg-gray-50">
      <CustomHeader navigation={navigation} title="Tendencias" />
      
      {/* Tabs */}
      <View className="bg-white border-b border-gray-100">
        <View className="flex-row px-2">
          {renderTabButton('trending', 'Trending', 'trending-up')}
          {renderTabButton('tweets', 'Tweets', 'chatbubbles')}
          {renderTabButton('news', 'Noticias', 'newspaper')}
          {renderTabButton('stories', 'Stories', 'albums')}
        </View>
      </View>

      {/* Categories for active tab (only for trending and news) */}
      {activeTab !== 'stories' && activeTab !== 'tweets' && (
        <View className="px-4 py-3 bg-white border-b border-gray-100">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 32 }}
          >
            <View className="flex-row items-center gap-2">
              {activeTab === 'trending' ? 
                categories.map(renderTrendingCategoryButton) :
                newsCategories.map(renderNewsCategoryButton)
              }
            </View>
          </ScrollView>
        </View>
      )}

      {/* Stats Bar (only for trending and news) */}
      {activeTab !== 'stories' && activeTab !== 'tweets' && (
        <View className="px-5 py-3 bg-gray-50">
          <View className="flex-row items-center justify-between">
            <Text className={textStyles.description}>
              {activeTab === 'trending' ?
                `${transformedTrendingData.length} tendencia${transformedTrendingData.length !== 1 ? 's' : ''}` :
                `${newsData.length} noticia${newsData.length !== 1 ? 's' : ''}`
              }
            </Text>
            <View className="flex-row items-center">
              <Ionicons name="time" size={14} color="#9CA3AF" />
              <Text className={`${textStyles.helper} ml-2`}>
                {activeTab === 'trending' ?
                  (trendingStats ? `${trendingStats?.localTrends ?? 0} locales, ${trendingStats?.globalTrends ?? 0} globales` : 'Actualizando...') :
                  (newsStats ? `${newsStats?.recentNews ?? 0} recientes, ${newsStats?.sourcesCount ?? 0} fuentes` : 'Actualizando...')
                }
              </Text>
            </View>
          </View>
          {!supabaseAvailable() && (
            <View className="mt-3 self-start px-3 py-1.5 bg-yellow-100 rounded-full">
              <Text className={`${textStyles.badge} text-yellow-700`}>Demo data (no Supabase key)</Text>
            </View>
          )}
          {((activeTab === 'trending' && trendingError) ||
            (activeTab === 'news' && newsError)) && (
            <View className="mt-3 px-4 py-3 bg-red-50 rounded-xl border border-red-200">
              <Text className={`${textStyles.helper} text-red-700`}>
                {activeTab === 'trending' ? trendingError : newsError}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Content */}
      {activeTab === 'stories' ? (
        <View className="flex-1">
          <FullScreenStoriesDisplay 
            onStoryChange={(story, index) => {
              // Optional: Track story changes for analytics
              console.log(`📊 TrendingScreen: Viewing story ${index + 1}: ${story.title}`);
            }}
          />
          {/* Development Debug Info */}
          {__DEV__ && (
            <View className="absolute top-16 right-4 z-20">
              <View className="bg-black bg-opacity-50 rounded-lg p-2">
                <Text className="text-white text-xs">Stories Tab Active</Text>
                <Text className="text-white text-xs">Debug Mode</Text>
              </View>
            </View>
          )}
        </View>
      ) : activeTab === 'tweets' ? (
        <MobileTweetsSection
          onTweetPress={(tweet) => {
            // Optional: Handle tweet press
            console.log('Tweet pressed:', tweet.id);
          }}
        />
      ) : (
        activeTab === 'trending' ? (
          <FlatList
            data={transformedTrendingData}
            renderItem={renderTrendingItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={
              <RefreshControl 
                refreshing={refreshingTrending} 
                onRefresh={handleTrendingRefresh} 
              />
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <View className="w-20 h-20 bg-gray-200 rounded-full items-center justify-center mb-4">
                  <Ionicons name="trending-up" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-black text-lg font-medium mb-2">No hay tendencias</Text>
                <Text className="text-gray-500 text-center">
                  {selectedCategory === 'all' 
                    ? 'No se encontraron tendencias recientes'
                    : `No hay tendencias en la categoría ${selectedCategory}`
                  }
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={newsData}
            renderItem={({ item }) => <NewsCard item={item} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={
              <RefreshControl 
                refreshing={refreshingNews} 
                onRefresh={handleNewsRefresh} 
              />
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <View className="w-20 h-20 bg-gray-200 rounded-full items-center justify-center mb-4">
                  <Ionicons name="newspaper" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-black text-lg font-medium mb-2">No hay noticias</Text>
                <Text className="text-gray-500 text-center">
                  {selectedNewsCategory === 'all'
                    ? 'No se encontraron noticias recientes'
                    : `No hay noticias en la categoría ${selectedNewsCategory}`
                  }
                </Text>
              </View>
            }
          />
        )
      )}
    </View>
  );
}