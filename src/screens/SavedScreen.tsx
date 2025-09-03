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
import { extractLinksFromText, processLinks } from '../api/link-processor';
import CustomHeader from '../components/CustomHeader';
import SavedItemCard from '../components/SavedItemCard';
import { SavedItem } from '../types/savedItem';

export default function SavedScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'link' | 'tweet' | 'video' | 'article'>('all');
  const [refreshing, setRefreshing] = useState(false);
  
  const { 
    items, 
    isLoading, 
    removeSavedItem, 
    toggleFavorite, 
    addSavedItem,
    setLoading 
  } = useSavedStore();

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.domain.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || item.type === selectedFilter;
    
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

      const linkDataArray = await processLinks(links);
      linkDataArray.forEach((linkData) => {
        addSavedItem(linkData, 'clipboard');
      });

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
      <View className="w-20 h-20 bg-gray-200 rounded-full items-center justify-center mb-4">
        <Ionicons name="bookmark-outline" size={32} color="#9CA3AF" />
      </View>
      <Text className="text-black text-lg font-medium mb-2">No Saved Links</Text>
      <Text className="text-gray-500 text-center mb-6">
        Share links in chat or paste them from your clipboard to save them here
      </Text>
      <Pressable
        onPress={handlePasteFromClipboard}
        disabled={isLoading}
        className="bg-blue-500 px-6 py-3 rounded-full flex-row items-center"
      >
        <Ionicons name="clipboard" size={16} color="white" />
        <Text className="text-white font-medium ml-2">
          {isLoading ? 'Processing...' : 'Paste from Clipboard'}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-100">
      <CustomHeader navigation={navigation} title="Saved" />
      
      {items.length > 0 && (
        <>
          {/* Search Bar */}
          <View className="px-4 py-3">
            <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-gray-200">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 text-base text-black"
                placeholder="Search saved links..."
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
                { key: 'all', label: 'All', icon: 'apps' },
                { key: 'link', label: 'Links', icon: 'link' },
                { key: 'tweet', label: 'Tweets', icon: 'logo-twitter' },
                { key: 'video', label: 'Videos', icon: 'play-circle' },
                { key: 'article', label: 'Articles', icon: 'document-text' },
              ]}
              renderItem={({ item }) => renderFilterButton(item.key as any, item.label, item.icon)}
              keyExtractor={(item) => item.key}
            />
          </View>

          {/* Action Bar */}
          <View className="flex-row items-center justify-between px-4 pb-3">
            <Text className="text-gray-600 text-sm">
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            </Text>
            <Pressable
              onPress={handlePasteFromClipboard}
              disabled={isLoading}
              className="flex-row items-center bg-white px-3 py-2 rounded-full border border-gray-200"
            >
              <Ionicons name="add" size={16} color="#3B82F6" />
              <Text className="text-blue-500 text-sm ml-1">
                {isLoading ? 'Adding...' : 'Paste'}
              </Text>
            </Pressable>
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
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}