/**
 * Simple Saved Screen
 * Test screen for the new simplified post persistence system
 * Replaces complex saved posts screen with direct database operations
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSimpleSavedStore, SavedItem, useAnalysisUpdates } from '../state/simpleSavedStore';
import { SimpleSavedItemCard } from '../components/SimpleSavedItemCard';
import { LinkData } from '../api/link-processor';

export const SimpleSavedScreen: React.FC = () => {
  const [testUrl, setTestUrl] = useState('https://x.com/elonmusk/status/1234567890');
  const [refreshing, setRefreshing] = useState(false);

  const {
    items,
    isLoading,
    isInitialized,
    initializeStore,
    addSavedItem,
    clearSavedItems,
    getSavedItems,
    getQualityStats
  } = useSimpleSavedStore();

  const { checkForUpdates } = useAnalysisUpdates();

  useEffect(() => {
    // Initialize store when component mounts
    if (!isInitialized) {
      initializeStore();
    }
  }, [isInitialized, initializeStore]);

  useEffect(() => {
    // Set up periodic checking for analysis updates
    const interval = setInterval(() => {
      checkForUpdates();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [checkForUpdates]);

  const handleAddTestPost = async () => {
    if (!testUrl.trim()) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    const testLinkData: LinkData = {
      url: testUrl.trim(),
      title: `Test Post - ${new Date().toLocaleTimeString()}`,
      description: `Test post for the simplified persistence system. URL: ${testUrl}`,
      type: 'link',
      platform: testUrl.includes('x.com') || testUrl.includes('twitter.com') ? 'x' :
                testUrl.includes('instagram.com') ? 'instagram' : 'web',
      media: [],
      processedByLinkProcessor: true
    };

    console.log('[SimpleSavedScreen] Adding test post:', testLinkData);

    const success = await addSavedItem(testLinkData, 'manual');

    if (success) {
      Alert.alert('Success', 'Post saved successfully!');
      setTestUrl('');
    } else {
      Alert.alert('Error', 'Failed to save post. Check the console for details.');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Posts',
      'Are you sure you want to clear all saved posts? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearSavedItems();
            Alert.alert('Cleared', 'All posts have been cleared from local storage.');
          }
        }
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await initializeStore(); // Reload from backend
      await checkForUpdates(); // Check for analysis updates
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    handleRefresh();
  }, []);

  const renderHeader = () => {
    const stats = getQualityStats();
    const processingCount = items.filter(item => item.status === 'processing').length;
    const completedCount = items.filter(item => item.status === 'completed').length;

    return (
      <View style={{ padding: 16, backgroundColor: '#F8F9FA' }}>
        {/* Title */}
        <Text style={{
          fontSize: 28,
          fontWeight: '700',
          color: '#1C1C1E',
          marginBottom: 8
        }}>
          Simple Saved Posts
        </Text>

        <Text style={{
          fontSize: 14,
          color: '#8E8E93',
          marginBottom: 16
        }}>
          New simplified post persistence without complex job management
        </Text>

        {/* Stats */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#007AFF' }}>{items.length}</Text>
            <Text style={{ fontSize: 12, color: '#8E8E93' }}>Total</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#FF9500' }}>{processingCount}</Text>
            <Text style={{ fontSize: 12, color: '#8E8E93' }}>Processing</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#34C759' }}>{completedCount}</Text>
            <Text style={{ fontSize: 12, color: '#8E8E93' }}>Completed</Text>
          </View>
        </View>

        {/* Test Controls */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#1C1C1E',
            marginBottom: 12
          }}>
            Test Controls
          </Text>

          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#E5E5EA',
              borderRadius: 8,
              padding: 12,
              fontSize: 14,
              marginBottom: 12,
              backgroundColor: '#F8F9FA'
            }}
            placeholder="Enter test URL (e.g., https://x.com/example)"
            value={testUrl}
            onChangeText={setTestUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={handleAddTestPost}
              style={{
                backgroundColor: '#007AFF',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 16,
                flex: 1,
                marginRight: 8,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center'
              }}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={{
                color: '#FFFFFF',
                fontWeight: '600',
                marginLeft: 6
              }}>
                Add Test Post
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClearAll}
              style={{
                backgroundColor: '#FF3B30',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 16,
                flex: 1,
                marginLeft: 8,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center'
              }}
            >
              <Ionicons name="trash" size={18} color="#FFFFFF" />
              <Text style={{
                color: '#FFFFFF',
                fontWeight: '600',
                marginLeft: 6
              }}>
                Clear All
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Initialization Status */}
        {!isInitialized && (
          <View style={{
            backgroundColor: '#FFF3E0',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <ActivityIndicator size="small" color="#FF9500" />
            <Text style={{
              color: '#FF9500',
              marginLeft: 8,
              fontWeight: '500'
            }}>
              Initializing store...
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 32
    }}>
      <Ionicons name="bookmark-outline" size={64} color="#C7C7CC" />
      <Text style={{
        fontSize: 18,
        fontWeight: '600',
        color: '#1C1C1E',
        marginTop: 16,
        marginBottom: 8
      }}>
        No Saved Posts
      </Text>
      <Text style={{
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
        lineHeight: 20
      }}>
        Add a test post using the form above to see the simplified persistence system in action.
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: SavedItem }) => (
    <SimpleSavedItemCard item={item} />
  );

  if (isLoading && !isInitialized) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        <StatusBar barStyle="dark-content" />
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{
            marginTop: 16,
            fontSize: 16,
            color: '#8E8E93'
          }}>
            Loading saved posts...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
        contentContainerStyle={{
          flexGrow: 1
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};