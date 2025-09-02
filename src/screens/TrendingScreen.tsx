import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
   FlatList, 
   Pressable, 
   RefreshControl,
   ScrollView,
   StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../components/CustomHeader';
import TrendingLoading from '../components/TrendingLoading';
import { TrendingService } from '../services/trendingService';
import { TrendingData } from '../config/supabase';
import { supabaseAvailable } from '../config/supabase';

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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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

      // Cargar trends más recientes primero
      await loadTrends();

      // Cargar categorías disponibles y generar fallbacks si es necesario
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
      
      // Cargar estadísticas
      const trendingStats = await TrendingService.getTrendingStats();
      setStats(trendingStats);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      setErrorMsg('No se pudieron cargar los datos de trending');
    } finally {
      setLoading(false);
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
      setErrorMsg('No se pudieron cargar las tendencias');
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

    return items.slice(0, 15); // Limitar a 15 items
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
      <View className="px-4 py-1 bg-white border-b" style={{ borderBottomWidth: StyleSheet.hairlineWidth }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 32 }}
        >
          <View className="flex-row items-center">
            {categories.map(renderCategoryButton)}
          </View>
        </ScrollView>
      </View>

      {/* Stats Bar */}
      <View className="px-4 py-1 bg-gray-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-gray-600 text-sm">
            {transformedData.length} trending topic{transformedData.length !== 1 ? 's' : ''}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="time" size={14} color="#9CA3AF" />
            <Text className="text-gray-500 text-xs ml-1">
              {stats ? `${stats?.localTrends ?? 0} locales, ${stats?.globalTrends ?? 0} globales` : 'Actualizando...'}
            </Text>
          </View>
        </View>
        {!supabaseAvailable() && (
          <View className="mt-2 self-start px-2 py-1 bg-yellow-100 rounded-full">
            <Text className="text-yellow-700 text-xs">Demo data (no Supabase key)</Text>
          </View>
        )}
        {errorMsg && (
          <View className="mt-2 px-3 py-2 bg-red-100 rounded-xl">
            <Text className="text-red-700 text-xs">{errorMsg}</Text>
          </View>
        )}
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