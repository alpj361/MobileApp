import React, { useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Pressable, 
  RefreshControl,
  TextInput,
  Alert 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSavedStore } from '../state/savedStore';
import { processImprovedLinks, extractLinksFromText } from '../api/improved-link-processor';
import CustomHeader from '../components/CustomHeader';
import SavedItemCard from '../components/SavedItemCard';
import { SavedItem } from '../state/savedStore';
import { textStyles } from '../utils/typography';

export default function SavedScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'link' | 'tweet' | 'video' | 'article' | 'quality'>('all');
  const [selectedQuality, setSelectedQuality] = useState<'all' | 'excellent' | 'good' | 'fair' | 'poor'>('all');
  const [refreshing, setRefreshing] = useState(false);
  
  const { 
    items, 
    isLoading, 
    removeSavedItem, 
    toggleFavorite, 
    addSavedItem,
    setLoading,
    getQualityStats 
  } = useSavedStore();

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.domain.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (selectedFilter === 'quality') {
      matchesFilter = selectedQuality === 'all' || item.quality === selectedQuality || 
                     (selectedQuality === 'poor' && !item.quality);
    } else {
      matchesFilter = selectedFilter === 'all' || item.type === selectedFilter;
    }
    
    return matchesSearch && matchesFilter;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Reprocess items that need better metadata
      const badPhrases = new Set(['No description available', 'Link processing failed', 'Vista previa no disponible']);
      const needs = items.filter(i => !i.image || !i.description || badPhrases.has(i.description));
      for (const it of needs) {
        await useSavedStore.getState().reprocessSavedItem(it.id);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      setLoading(true);
      const clipboardText = await Clipboard.getStringAsync();
      
      if (!clipboardText) {
        Alert.alert('No Content', 'Clipboard is empty');
        return;
      }

      const links = extractLinksFromText(clipboardText);
      
      if (links.length === 0) {
        Alert.alert('No Links Found', 'No valid URLs found in clipboard');
        return;
      }

      // Use improved processing
      const linkDataArray = await processImprovedLinks(links);
      
      for (const linkData of linkDataArray) {
        await addSavedItem(linkData, 'clipboard');
      }

      Alert.alert(
        'Links Saved', 
        `Successfully saved ${links.length} link${links.length > 1 ? 's' : ''} from clipboard`
      );
    } catch (error) {
      console.error('Clipboard paste error:', error);
      Alert.alert('Error', 'Failed to process clipboard content');
    } finally {
      setLoading(false);
    }
  };

  const renderFilterButton = (filter: typeof selectedFilter, label: string, icon: string) => (
    <Pressable
      onPress={() => setSelectedFilter(filter)}
      className={`px-4 py-2 rounded-full mr-2 flex-row items-center ${
        selectedFilter === filter ? 'bg-blue-500' : 'bg-white border border-gray-200'
      }`}
    >
      <Ionicons 
        name={icon as any} 
        size={16} 
        color={selectedFilter === filter ? 'white' : '#6B7280'} 
      />
      <Text className={`ml-2 text-sm ${
        selectedFilter === filter ? 'text-white font-medium' : 'text-gray-700'
      }`}>
        {label}
      </Text>
    </Pressable>
  );

  const renderSavedItem = ({ item }: { item: SavedItem }) => (
    <SavedItemCard
      item={item}
      onToggleFavorite={() => toggleFavorite(item.id)}
      onDelete={() => removeSavedItem(item.id)}
    />
  );

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-8">
      <View className="w-24 h-24 bg-gray-200 rounded-full items-center justify-center mb-6">
        <Ionicons name="bookmark-outline" size={36} color="#9CA3AF" />
      </View>
      <Text className={`${textStyles.sectionTitle} mb-3`}>No hay enlaces guardados</Text>
      <Text className={`${textStyles.description} text-center mb-8`}>
        Comparte enlaces en el chat o pégalos desde tu portapapeles para guardarlos aquí
      </Text>
      <Pressable
        onPress={handlePasteFromClipboard}
        disabled={isLoading}
        className="bg-blue-500 px-6 py-4 rounded-full flex-row items-center shadow-sm active:bg-blue-600"
        style={({ pressed }) => [
          {
            transform: [{ scale: pressed ? 0.95 : 1 }],
          }
        ]}
      >
        <Ionicons name="clipboard" size={18} color="white" />
        <Text className={`${textStyles.buttonText} ml-3`}>
          {isLoading ? 'Procesando...' : 'Pegar del Portapapeles'}
        </Text>
      </Pressable>
      
      {/* Improved processing indicator */}
      <View className="mt-6 px-4 py-2 bg-blue-50 rounded-full border border-blue-200">
        <Text className={`${textStyles.badge} text-blue-700`}>
          ✨ Procesamiento mejorado con limpieza HTML
        </Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <CustomHeader navigation={navigation} title="Guardados" />
      
      {items.length > 0 && (
        <>
          {/* Search Bar */}
          <View className="px-5 py-4">
            <View className="flex-row items-center bg-white rounded-3xl px-5 py-4 border border-gray-100 shadow-sm">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                className={`flex-1 ml-3 ${textStyles.bodyText}`}
                placeholder="Buscar enlaces guardados..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Filter Buttons */}
          <View className="px-4 pb-3">
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[
                { key: 'all', label: 'Todos', icon: 'apps' },
                { key: 'link', label: 'Links', icon: 'link' },
                { key: 'tweet', label: 'Tweets', icon: 'logo-twitter' },
                { key: 'video', label: 'Videos', icon: 'play-circle' },
                { key: 'article', label: 'Artículos', icon: 'document-text' },
                { key: 'quality', label: 'Calidad', icon: 'star' },
              ]}
              renderItem={({ item }) => renderFilterButton(item.key as any, item.label, item.icon)}
              keyExtractor={(item) => item.key}
            />
          </View>

          {/* Quality Filter (when quality filter is selected) */}
          {selectedFilter === 'quality' && (
            <View className="px-4 pb-3">
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[
                  { key: 'all', label: 'Todas', color: '#6B7280' },
                  { key: 'excellent', label: 'Excelente', color: '#10B981' },
                  { key: 'good', label: 'Buena', color: '#3B82F6' },
                  { key: 'fair', label: 'Regular', color: '#F59E0B' },
                  { key: 'poor', label: 'Básica', color: '#EF4444' },
                ]}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => setSelectedQuality(item.key as any)}
                    className={`px-3 py-2 rounded-full mr-2 flex-row items-center ${
                      selectedQuality === item.key ? 'border-2' : 'bg-white border border-gray-200'
                    }`}
                    style={selectedQuality === item.key ? { borderColor: item.color, backgroundColor: item.color + '20' } : {}}
                  >
                    <View 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <Text 
                      className={`text-sm ${selectedQuality === item.key ? 'font-medium' : 'text-gray-700'}`}
                      style={selectedQuality === item.key ? { color: item.color } : {}}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                )}
                keyExtractor={(item) => item.key}
              />
            </View>
          )}

          {/* Action Bar with Stats */}
          <View className="px-4 pb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className={textStyles.description}>
                {filteredItems.length} elemento{filteredItems.length !== 1 ? 's' : ''}
              </Text>
              <Pressable
                onPress={handlePasteFromClipboard}
                disabled={isLoading}
                className="flex-row items-center bg-white px-3 py-2 rounded-full border border-gray-200 active:bg-gray-50"
              >
                <Ionicons name="add" size={16} color="#3B82F6" />
                <Text className={`${textStyles.badge} text-blue-500 ml-1`}>
                  {isLoading ? 'Agregando...' : 'Pegar'}
                </Text>
              </Pressable>
            </View>
            
            {/* Quality Stats */}
            {items.length > 0 && (
              <View className="flex-row items-center gap-4">
                {(() => {
                  const stats = getQualityStats();
                  return (
                    <>
                      {stats.excellent > 0 && (
                        <View className="flex-row items-center">
                          <View className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                          <Text className={`${textStyles.helper} text-gray-500`}>
                            {stats.excellent} excelente{stats.excellent !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                      {stats.good > 0 && (
                        <View className="flex-row items-center">
                          <View className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                          <Text className={`${textStyles.helper} text-gray-500`}>
                            {stats.good} buena{stats.good !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                      {stats.poor > 0 && (
                        <View className="flex-row items-center">
                          <View className="w-2 h-2 rounded-full bg-red-500 mr-1" />
                          <Text className={`${textStyles.helper} text-gray-500`}>
                            {stats.poor} básica{stats.poor !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                    </>
                  );
                })()}
              </View>
            )}
          </View>
        </>
      )}

      {/* Content */}
      {filteredItems.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderSavedItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}