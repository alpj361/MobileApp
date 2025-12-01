import React, { useState, useEffect } from 'react';
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
import { useSavedStore } from '../state/savedStore';
import { getClipboardText } from '../utils/clipboard';
import { processImprovedLinks, extractLinksFromText } from '../api/improved-link-processor';
import CustomHeader from '../components/CustomHeader';
import { SavedItemCard } from '../components/SavedItemCard';
import LoadingItemCard from '../components/LoadingItemCard';
import { SavedItem } from '../state/savedStore';
import { textStyles } from '../utils/typography';

export default function SavedScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const {
    items,
    isLoading,
    removeSavedItem,
    toggleFavorite,
    addSavedItem,
    setLoading,
    initializeStore,
  } = useSavedStore();

  useEffect(() => {
    initializeStore();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.domain.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Reprocess items that need better metadata (including "Untitled Post")
      const badPhrases = new Set(['No description available', 'Link processing failed', 'Vista previa no disponible']);
      const needsReprocessing = items.filter(item =>
        !item.title ||
        item.title === 'Untitled Post' ||
        !item.description ||
        badPhrases.has(item.description) ||
        !item.image
      );

      console.log(`[SavedScreen] Reprocessing ${needsReprocessing.length} items that need better metadata`);

      for (const item of needsReprocessing) {
        try {
          console.log(`[SavedScreen] Reprocessing: ${item.url}`);
          const processedData = await processImprovedLinks([item.url]);

          if (processedData && processedData.length > 0) {
            const updatedData = processedData[0];
            // Update the item in the store
            const { updateSavedItem } = useSavedStore.getState();
            if (updateSavedItem) {
              await updateSavedItem(item.id, updatedData);
              console.log(`[SavedScreen] ✅ Reprocessed: ${item.url}`);
            }
          }
        } catch (error) {
          console.error(`[SavedScreen] Failed to reprocess ${item.url}:`, error);
        }
      }

      console.log(`[SavedScreen] Refresh completed for ${items.length} items`);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      setLoading(true);
      const clipboardText = await getClipboardText();

      if (!clipboardText || clipboardText.trim() === '') {
        Alert.alert('Sin contenido', 'El portapapeles está vacío');
        return;
      }

      const links = extractLinksFromText(clipboardText);

      if (links.length === 0) {
        Alert.alert('Sin enlaces', 'No se encontraron URLs válidas en el portapapeles');
        return;
      }

      // Process each link individually to extract metadata
      let addedCount = 0;
      for (const link of links) {
        try {
          // Process link to extract title, description, image, etc.
          console.log(`[SavedScreen] Processing link: ${link}`);
          const processedData = await processImprovedLinks([link]);

          if (processedData && processedData.length > 0) {
            const linkData = processedData[0];
            // Save the processed link data
            const inserted = await addSavedItem(linkData, 'clipboard');
            if (inserted) {
              addedCount += 1;
            }
          } else {
            // Fallback: Create basic LinkData if processing fails
            console.warn(`[SavedScreen] Failed to process link: ${link}, using basic data`);
            const basicLinkData = {
              url: link,
              title: '',
              description: '',
              domain: new URL(link).hostname.replace('www.', ''),
              type: 'article' as const,
              platform: 'generic' as const,
              image: '',
              engagement: { likes: 0, comments: 0, shares: 0, views: 0 },
              timestamp: Date.now(),
            };

            const inserted = await addSavedItem(basicLinkData, 'clipboard');
            if (inserted) {
              addedCount += 1;
            }
          }
        } catch (error) {
          console.error(`[SavedScreen] Error processing link ${link}:`, error);
          // Continue with next link on error
        }
      }

      if (addedCount === 0) {
        Alert.alert(
          'Sin cambios',
          links.length === 1
            ? 'Ese enlace ya estaba guardado.'
            : 'Todos los enlaces del portapapeles ya estaban guardados.'
        );
      } else {
        const skipped = links.length - addedCount;
        const message = skipped > 0
          ? `Se guardaron ${addedCount} enlace${addedCount > 1 ? 's' : ''}. ${skipped} ya estaban guardados.`
          : `Successfully saved ${addedCount} link${addedCount > 1 ? 's' : ''} from clipboard`;
        Alert.alert('Links Saved', message);
      }
    } catch (error: any) {
      console.error('[SavedScreen] Clipboard paste error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Error al leer el portapapeles';
      
      if (error?.message?.includes('user interaction')) {
        errorMessage = 'Por favor, haz clic en el botón nuevamente para acceder al portapapeles';
      } else if (error?.message?.includes('not available')) {
        errorMessage = 'El acceso al portapapeles no está disponible en este navegador';
      } else if (error?.message?.includes('permission')) {
        errorMessage = 'Se requiere permiso para acceder al portapapeles';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Test extractor removed

  // Filter button UI removed

  const renderSavedItem = ({ item }: { item: SavedItem }) => {
    // Show loading placeholder for pending items
    if (item.isPending) {
      return <LoadingItemCard url={item.url} />;
    }

    return (
      <SavedItemCard
        item={item}
      />
    );
  };

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

      {/* Indicators removed for cleaner empty state */}
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

          {/* Filters removed for simpler UI */}

          {/* Quality filter removed */}

          {/* Action Bar with Stats */}
          <View className="px-4 pb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className={textStyles.description}>
                {filteredItems.length} elemento{filteredItems.length !== 1 ? 's' : ''}
              </Text>
              <View className="flex-row gap-2">
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
            </View>

            {/* Quality stats removed */}
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
