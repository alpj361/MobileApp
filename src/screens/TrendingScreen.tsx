import React, { useState } from 'react';
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

interface TrendingItem {
  id: string;
  title: string;
  category: string;
  engagement: string;
  trend: 'up' | 'down' | 'stable';
  rank: number;
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

  const categories: TrendingCategory[] = [
    { id: 'all', name: 'All', icon: 'apps', color: '#6B7280' },
    { id: 'tech', name: 'Tech', icon: 'hardware-chip', color: '#3B82F6' },
    { id: 'ai', name: 'AI', icon: 'bulb', color: '#8B5CF6' },
    { id: 'crypto', name: 'Crypto', icon: 'logo-bitcoin', color: '#F59E0B' },
    { id: 'social', name: 'Social', icon: 'people', color: '#EF4444' },
    { id: 'news', name: 'News', icon: 'newspaper', color: '#10B981' },
  ];

  const mockTrendingData: TrendingItem[] = [
    {
      id: '1',
      title: 'OpenAI GPT-5 Release',
      category: 'ai',
      engagement: '2.4M discussions',
      trend: 'up',
      rank: 1,
    },
    {
      id: '2',
      title: 'Bitcoin Price Surge',
      category: 'crypto',
      engagement: '1.8M mentions',
      trend: 'up',
      rank: 2,
    },
    {
      id: '3',
      title: 'Apple Vision Pro Updates',
      category: 'tech',
      engagement: '1.2M posts',
      trend: 'stable',
      rank: 3,
    },
    {
      id: '4',
      title: 'Meta AI Integration',
      category: 'social',
      engagement: '980K shares',
      trend: 'up',
      rank: 4,
    },
    {
      id: '5',
      title: 'Tesla Robotaxi Launch',
      category: 'tech',
      engagement: '850K discussions',
      trend: 'down',
      rank: 5,
    },
    {
      id: '6',
      title: 'Climate Summit 2025',
      category: 'news',
      engagement: '720K mentions',
      trend: 'up',
      rank: 6,
    },
    {
      id: '7',
      title: 'Quantum Computing Breakthrough',
      category: 'tech',
      engagement: '650K posts',
      trend: 'up',
      rank: 7,
    },
    {
      id: '8',
      title: 'Social Media Regulation',
      category: 'social',
      engagement: '580K discussions',
      trend: 'stable',
      rank: 8,
    },
  ];

  const filteredData = selectedCategory === 'all' 
    ? mockTrendingData 
    : mockTrendingData.filter(item => item.category === selectedCategory);

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
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

  const renderCategoryButton = (category: TrendingCategory) => (
    <Pressable
      key={category.id}
      onPress={() => setSelectedCategory(category.id)}
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
          <Ionicons 
            name={trendIcon.name as any} 
            size={20} 
            color={trendIcon.color} 
          />
        </View>
        
        <View className="flex-row items-center justify-between">
          <Text className="text-gray-500 text-sm">
            {item.engagement}
          </Text>
          <View className="flex-row items-center">
            <View className={`px-2 py-1 rounded-full ${
              categories.find(c => c.id === item.category)?.color === '#3B82F6' ? 'bg-blue-100' :
              categories.find(c => c.id === item.category)?.color === '#8B5CF6' ? 'bg-purple-100' :
              categories.find(c => c.id === item.category)?.color === '#F59E0B' ? 'bg-yellow-100' :
              categories.find(c => c.id === item.category)?.color === '#EF4444' ? 'bg-red-100' :
              'bg-green-100'
            }`}>
              <Text className={`text-xs font-medium ${
                categories.find(c => c.id === item.category)?.color === '#3B82F6' ? 'text-blue-700' :
                categories.find(c => c.id === item.category)?.color === '#8B5CF6' ? 'text-purple-700' :
                categories.find(c => c.id === item.category)?.color === '#F59E0B' ? 'text-yellow-700' :
                categories.find(c => c.id === item.category)?.color === '#EF4444' ? 'text-red-700' :
                'text-green-700'
              }`}>
                {categories.find(c => c.id === item.category)?.name || 'Other'}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

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
          {filteredData.length} trending topic{filteredData.length !== 1 ? 's' : ''}
        </Text>
        <View className="flex-row items-center">
          <Ionicons name="time" size={14} color="#9CA3AF" />
          <Text className="text-gray-500 text-xs ml-1">
            Updated 5 min ago
          </Text>
        </View>
      </View>

      {/* Trending List */}
      <FlatList
        data={filteredData}
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
            <Text className="text-black text-lg font-medium mb-2">No Trending Topics</Text>
            <Text className="text-gray-500 text-center">
              Pull to refresh and check for the latest trends
            </Text>
          </View>
        }
      />
    </View>
  );
}