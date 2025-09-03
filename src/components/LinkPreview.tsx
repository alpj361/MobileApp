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

  const getPlatformIcon = () => {
    switch (linkData.platform) {
      case 'instagram':
        return '📷';
      case 'tiktok':
        return '🎵';
      case 'twitter':
        return '🐦';
      case 'youtube':
        return '▶️';
      default:
        return '🔗';
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
      case 'instagram':
        return 'camera';
      case 'tiktok':
        return 'musical-notes';
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
      case 'instagram':
        return '#E4405F';
      case 'tiktok':
        return '#000000';
      default:
        return '#6B7280';
    }
  };

  const getPlatformColor = () => {
    switch (linkData.platform) {
      case 'instagram':
        return '#E4405F';
      case 'tiktok':
        return '#000000';
      case 'twitter':
        return '#1DA1F2';
      case 'youtube':
        return '#FF0000';
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
            <Text className="text-2xl">{getPlatformIcon()}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-black font-medium text-sm" numberOfLines={1}>
              {linkData.title}
            </Text>
            <Text className="text-gray-500 text-xs" numberOfLines={1}>
              {linkData.domain}
            </Text>
            {linkData.author && (
              <Text className="text-blue-500 text-xs" numberOfLines={1}>
                por {linkData.author}
              </Text>
            )}
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
      {/* Header con plataforma */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <View className="flex-row items-center">
          <Text className="text-xl mr-2">{getPlatformIcon()}</Text>
          <Text className="text-gray-600 text-sm font-medium uppercase tracking-wide">
            {linkData.platform === 'generic' ? linkData.domain : linkData.platform}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons 
            name={getTypeIcon() as any} 
            size={16} 
            color={getTypeColor()} 
          />
        </View>
      </View>

      {/* Imagen o placeholder */}
      {linkData.image ? (
        <Image
          source={{ uri: linkData.image }}
          className="w-full h-48"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex-row items-center justify-center">
          <View className="items-center">
            <Text className="text-4xl mb-2">{getPlatformIcon()}</Text>
            <Text className="text-gray-500 text-sm">Sin miniatura</Text>
          </View>
        </View>
      )}
      
      {/* Contenido */}
      <View className="p-4">
        {/* Título */}
        <Text className="text-black font-semibold text-base mb-2" numberOfLines={2}>
          {linkData.title}
        </Text>
        
        {/* Descripción */}
        {linkData.description && (
          <Text className="text-gray-600 text-sm leading-5 mb-3" numberOfLines={3}>
            {linkData.description}
          </Text>
        )}
        
        {/* Metadatos adicionales */}
        <View className="flex-row items-center justify-between mb-3">
          {linkData.author && (
            <View className="flex-row items-center">
              <Ionicons name="person-outline" size={14} color="#6B7280" />
              <Text className="text-gray-500 text-xs ml-1" numberOfLines={1}>
                {linkData.author}
              </Text>
            </View>
          )}
          
          {linkData.engagement && (
            <View className="flex-row items-center space-x-3">
              {linkData.engagement.likes && (
                <View className="flex-row items-center">
                  <Ionicons name="heart-outline" size={14} color="#EF4444" />
                  <Text className="text-gray-500 text-xs ml-1">
                    {linkData.engagement.likes}
                  </Text>
                </View>
              )}
              {linkData.engagement.comments && (
                <View className="flex-row items-center">
                  <Ionicons name="chatbubble-outline" size={14} color="#3B82F6" />
                  <Text className="text-gray-500 text-xs ml-1">
                    {linkData.engagement.comments}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        
        {/* Footer */}
        <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            <Image source={{ uri: favicon }} resizeMode="contain" className="w-4 h-4 mr-2" />
            <Text className="text-gray-400 text-xs">
              {new Date(linkData.timestamp).toLocaleDateString()}
            </Text>
          </View>
          
          <View className="flex-row items-center space-x-2">
            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: getPlatformColor() }} />
            <Ionicons name="open-outline" size={16} color="#9CA3AF" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}