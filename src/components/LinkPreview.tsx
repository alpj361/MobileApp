import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { LinkData } from '../api/link-processor';

interface LinkPreviewProps {
  linkData: LinkData;
  compact?: boolean;
  onPress?: () => void;
}

export default function LinkPreview({ linkData, compact = false, onPress }: LinkPreviewProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      Linking.openURL(linkData.url);
    }
  };

  const getTypeIcon = () => {
    switch (linkData.type) {
      case 'tweet':
        return 'logo-twitter';
      case 'video':
        return 'play-circle';
      case 'article':
        return 'document-text';
      default:
        return 'link';
    }
  };

  const getTypeColor = () => {
    switch (linkData.type) {
      case 'tweet':
        return '#1DA1F2';
      case 'video':
        return '#FF0000';
      case 'article':
        return '#4CAF50';
      default:
        return '#6B7280';
    }
  };

  if (compact) {
    return (
      <Pressable
        onPress={handlePress}
        className="bg-white rounded-xl p-3 mb-2 border border-gray-200 active:bg-gray-50"
      >
        <View className="flex-row items-center">
          <View className="mr-3">
            <Ionicons 
              name={getTypeIcon() as any} 
              size={20} 
              color={getTypeColor()} 
            />
          </View>
          <View className="flex-1">
            <Text className="text-black font-medium text-sm" numberOfLines={1}>
              {linkData.title}
            </Text>
            <Text className="text-gray-500 text-xs" numberOfLines={1}>
              {linkData.domain}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </View>
      </Pressable>
    );
  }

  const favicon = linkData.favicon || `https://icons.duckduckgo.com/ip3/${linkData.domain}.ico`;
  return (
    <Pressable
      onPress={handlePress}
      className="bg-white rounded-2xl overflow-hidden border border-gray-200 active:bg-gray-50"
    >
      {linkData.image ? (
        <Image
          source={{ uri: linkData.image }}
          className="w-full h-48"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-14 bg-gray-50 flex-row items-center px-4">
          <Image source={{ uri: favicon }} resizeMode="contain" className="w-6 h-6 mr-2" />
          <Text className="text-gray-600 text-sm" numberOfLines={1}>{linkData.domain}</Text>
        </View>
      )}
      
      <View className="p-4">
        <View className="flex-row items-center mb-2">
          <Ionicons 
            name={getTypeIcon() as any} 
            size={16} 
            color={getTypeColor()} 
          />
          <Text className="text-gray-500 text-xs ml-2 uppercase tracking-wide" numberOfLines={1}>
            {linkData.domain}
          </Text>
        </View>
        
        <Text className="text-black font-semibold text-base mb-2" numberOfLines={2}>
          {linkData.title}
        </Text>
        
        {linkData.description && (
          <Text className="text-gray-600 text-sm leading-5" numberOfLines={3}>
            {linkData.description}
          </Text>
        )}
        
        <View className="flex-row items-center justify-between mt-3">
          <Text className="text-gray-400 text-xs">
            {new Date(linkData.timestamp).toLocaleDateString()}
          </Text>
          <Ionicons name="open-outline" size={16} color="#9CA3AF" />
        </View>
      </View>
    </Pressable>
  );
}