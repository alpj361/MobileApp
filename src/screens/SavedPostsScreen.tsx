/**
 * Pantalla principal de Saved Posts
 * Muestra los posts guardados con el modal de análisis
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSavedStore } from '../state/savedStore';
import { SavedItemCard } from '../components/SavedItemCard';
import { AnalysisLoadingModal } from '../components/AnalysisLoadingModal';

export const SavedPostsScreen: React.FC = () => {
  const {
    items,
    isLoading,
    analysisModal,
    initializeStore,
    addSavedItem,
    hideAnalysisModal,
    getSavedItems
  } = useSavedStore();

  const [newUrl, setNewUrl] = React.useState('');
  const [showAddUrl, setShowAddUrl] = React.useState(false);

  useEffect(() => {
    initializeStore();
  }, []);

  const handleAddPost = async () => {
    if (!newUrl.trim()) {
      Alert.alert('Error', 'Por favor ingresa una URL válida');
      return;
    }

    // Validate URL
    try {
      const url = new URL(newUrl.trim());
      if (!url.hostname.includes('x.com') && !url.hostname.includes('twitter.com')) {
        Alert.alert('Error', 'Por favor ingresa una URL de X/Twitter');
        return;
      }
    } catch (error) {
      Alert.alert('Error', 'URL no válida');
      return;
    }

    const success = await addSavedItem({
      url: newUrl.trim(),
      title: 'Nuevo Post',
      description: 'Cargando...',
      type: 'social_media',
      platform: newUrl.includes('x.com') ? 'x' : 'twitter'
    });

    if (success) {
      setNewUrl('');
      setShowAddUrl(false);
    } else {
      Alert.alert('Error', 'No se pudo guardar el post');
    }
  };

  const handleQuickAdd = () => {
    // Pre-filled URL for testing
    setNewUrl('https://x.com/republicagt/status/1992216496211198174');
    setShowAddUrl(true);
  };

  const renderPost = ({ item, index }) => (
    <SavedItemCard item={item} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bookmark-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No tienes posts guardados</Text>
      <Text style={styles.emptyDescription}>
        Agrega tu primer post de X/Twitter para comenzar
      </Text>
      <TouchableOpacity style={styles.addButton} onPress={handleQuickAdd}>
        <Ionicons name="add" size={24} color="white" />
        <Text style={styles.addButtonText}>Agregar Post de Prueba</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Posts Guardados</Text>
        <TouchableOpacity
          style={styles.addUrlButton}
          onPress={() => setShowAddUrl(true)}
        >
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Add URL Input */}
      {showAddUrl && (
        <View style={styles.addUrlContainer}>
          <TextInput
            style={styles.urlInput}
            placeholder="Pegar URL de X/Twitter..."
            value={newUrl}
            onChangeText={setNewUrl}
            autoCapitalize="none"
            keyboardType="url"
            autoFocus
          />
          <View style={styles.urlActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowAddUrl(false);
                setNewUrl('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddPost}
            >
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Posts List */}
      <FlatList
        data={getSavedItems()}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={initializeStore}
      />

      {/* Analysis Loading Modal */}
      <AnalysisLoadingModal
        visible={analysisModal.visible}
        postUrl={analysisModal.postUrl}
        stage={analysisModal.stage}
      />

      {/* Stats Footer */}
      <View style={styles.footer}>
        <Text style={styles.statsText}>
          {items.length} post{items.length !== 1 ? 's' : ''} guardado{items.length !== 1 ? 's' : ''}
          {items.filter(i => i.status === 'completed').length > 0 && (
            ` • ${items.filter(i => i.status === 'completed').length} analizados`
          )}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E'
  },
  addUrlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center'
  },
  addUrlContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  urlInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
    marginBottom: 12
  },
  urlActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F2F2F7'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93'
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#007AFF'
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  },
  list: {
    padding: 8
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8
  },
  emptyDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  },
  footer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA'
  },
  statsText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center'
  }
});