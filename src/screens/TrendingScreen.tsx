import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Pressable, 
  RefreshControl,
  ScrollView,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../components/CustomHeader';
import TrendingLoading from '../components/TrendingLoading';
import { TrendingService } from '../services/trendingService';
import { TrendingData, TrendingKeyword } from '../config/supabase';

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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trendingData, setTrendingData] = useState<TrendingData[]>([]);
  const [categories, setCategories] = useState<TrendingCategory[]>([]);
  const [stats, setStats] = useState<{
    totalTrends: number;
    localTrends: number;
    globalTrends: number;
    highRelevance: number;
  } | null>(null);

  // Mapeo de categorías a iconos y colores
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
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Cargar categorías disponibles
      const availableCategories = await TrendingService.getAvailableCategories();
      const categoryList: TrendingCategory[] = [
        { id: 'all', name: 'Todos', icon: 'apps', color: '#6B7280' },
        ...availableCategories.map(cat => ({
          id: cat,
          name: cat,
          icon: categoryMapping[cat]?.icon || 'apps',
          color: categoryMapping[cat]?.color || '#6B7280'
        }))
      ];
      setCategories(categoryList);

      // Cargar trends más recientes
      await loadTrends();
      
      // Cargar estadísticas
      const trendingStats = await TrendingService.getTrendingStats();
      setStats(trendingStats);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos de trending');
    } finally {
      setLoading(false);
    }
  };

  const loadTrends = async () => {
    try {
      let response;
      if (selectedCategory === 'all') {
        response = await TrendingService.getLatestTrends(20);
      } else {
        response = await TrendingService.getTrendsByCategory(selectedCategory, 20);
      }

      if (response.error) {
        throw response.error;
      }

      setTrendingData(response.data || []);
    } catch (error) {
      console.error('Error loading trends:', error);
      Alert.alert('Error', 'No se pudieron cargar las tendencias');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTrends();
    setRefreshing(false);
  };

  const handleCategoryChange = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    setLoading(true);
    await loadTrends();
    setLoading(false);
  };

  // Convertir datos de Supabase a formato de UI
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
          trend: 'up' as const, // Por defecto, ya que son trends actuales
          rank: rank++,
          description: keyword.about.razon_tendencia,
          isLocal: keyword.about.contexto_local,
          relevance: keyword.about.relevancia,
          date: keyword.about.fecha_evento
        });
      });
    });

    return items.slice(0, 20); // Limitar a 20 items
  };

  const getTrendIcon = (trend: TrendingItem['trend']) => {
    switch (trend) {
      case 'up':
        return { name: 'trending-up', color: '#10B981' };
      case 'down':
        return { name: 'trending-down', color: '#EF4444' };
      default:
        return { name: 'remove', color: '#6B7280' };
    }
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

  const renderCategoryButton = (category: TrendingCategory) => (
    <Pressable
      key={category.id}
      onPress={() => handleCategoryChange(category.id)}
      className={`px-4 py-2 rounded-full mr-3 flex-row items-center ${
        selectedCategory === category.id ? 'bg-blue-500' : 'bg-white border border-gray-200'
      }`}
    >
      <Ionicons 
        name={category.icon as any} 
        size={16} 
        color={selectedCategory === category.id ? 'white' : category.color} 
      />
      <Text className={`ml-2 text-sm ${
        selectedCategory === category.id ? 'text-white font-medium' : 'text-gray-700'
      }`}>
        {category.name}
      </Text>
    </Pressable>
  );

  const renderTrendingItem = ({ item }: { item: TrendingItem }) => {
    const trendIcon = getTrendIcon(item.trend);
    const categoryInfo = categories.find(c => c.id === item.category);
    
    return (
      <Pressable className="bg-white rounded-2xl p-4 mb-3 border border-gray-200 active:bg-gray-50">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <View className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center mr-3">
              <Text className="text-gray-600 font-bold text-sm">#{item.rank}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-black font-semibold text-base" numberOfLines={1}>
                {item.title}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            {item.isLocal && (
              <View className="mr-2 px-2 py-1 bg-green-100 rounded-full">
                <Text className="text-green-700 text-xs font-medium">Local</Text>
              </View>
            )}
            <Ionicons 
              name="trending-up" 
              size={20} 
              color={getRelevanceColor(item.relevance)} 
            />
          </View>
        </View>
        
        <Text className="text-gray-600 text-sm mb-2" numberOfLines={2}>
          {item.description}
        </Text>
        
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="text-gray-500 text-sm">
              {item.engagement}
            </Text>
            <Text className="text-gray-400 text-xs ml-2">
              {item.date}
            </Text>
          </View>
          <View className="flex-row items-center">
            <View className={`px-2 py-1 rounded-full ${
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
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-100">
        <CustomHeader navigation={navigation} title="Trending" />
        <TrendingLoading />
      </View>
    );
  }

  const transformedData = transformTrendingData();

  return (
    <View className="flex-1 bg-gray-100">
      <CustomHeader navigation={navigation} title="Trending" />
      
      {/* Categories */}
      <View className="px-4 py-3">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {categories.map(renderCategoryButton)}
        </ScrollView>
      </View>

      {/* Stats Bar */}
      <View className="flex-row items-center justify-between px-4 pb-3">
        <Text className="text-gray-600 text-sm">
          {transformedData.length} trending topic{transformedData.length !== 1 ? 's' : ''}
        </Text>
        <View className="flex-row items-center">
          <Ionicons name="time" size={14} color="#9CA3AF" />
          <Text className="text-gray-500 text-xs ml-1">
            {stats ? `${stats.localTrends} locales, ${stats.globalTrends} globales` : 'Actualizando...'}
          </Text>
        </View>
      </View>

      {/* Trending List */}
      <FlatList
        data={transformedData}
        renderItem={renderTrendingItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
    </View>
  );
}