import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { SavedItem } from '../state/savedStore';

interface SavedItemCardProps {
  item: SavedItem;
  onPress?: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
}

export default function SavedItemCard({ 
  item, 
  onPress, 
  onToggleFavorite, 
  onDelete 
}: SavedItemCardProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      Linking.openURL(item.url);
    }
  };

  const getPlatformIcon = () => {
    switch (item.platform) {
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

  const getPlatformColor = () => {
    switch (item.platform) {
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

  const getSourceIcon = () => {
    switch (item.source) {
      case 'chat':
        return 'chatbubble-outline';
      case 'clipboard':
        return 'clipboard-outline';
      case 'manual':
        return 'add-circle-outline';
      default:
        return 'link-outline';
    }
  };

  const getSourceColor = () => {
    switch (item.source) {
      case 'chat':
        return '#3B82F6';
      case 'clipboard':
        return '#10B981';
      case 'manual':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const getSourceLabel = () => {
    switch (item.source) {
      case 'chat':
        return 'From Chat';
      case 'clipboard':
        return 'From Clipboard';
      case 'manual':
        return 'Manual Entry';
      default:
        return 'Unknown Source';
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      className="bg-white rounded-2xl overflow-hidden border border-gray-200 active:bg-gray-50 mb-4"
    >
      {/* Header con plataforma y fuente */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <View className="flex-row items-center">
          <Text className="text-xl mr-2">{getPlatformIcon()}</Text>
          <Text className="text-gray-600 text-sm font-medium uppercase tracking-wide">
            {item.platform === 'generic' ? item.domain : item.platform}
          </Text>
        </View>
        
        <View className="flex-row items-center space-x-2">
          {/* Indicador de fuente */}
          <View className="flex-row items-center bg-gray-100 px-2 py-1 rounded-full">
            <Ionicons 
              name={getSourceIcon() as any} 
              size={12} 
              color={getSourceColor()} 
            />
            <Text className="text-gray-500 text-xs ml-1">
              {getSourceLabel()}
            </Text>
          </View>
        </View>
      </View>

      {/* Imagen o placeholder */}
      {item.image ? (
        <Image
          source={{ uri: item.image }}
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
          {item.title}
        </Text>
        
        {/* Descripción */}
        {item.description && (
          <Text className="text-gray-600 text-sm leading-5 mb-3" numberOfLines={3}>
            {item.description}
          </Text>
        )}
        
        {/* Metadatos adicionales */}
        <View className="flex-row items-center justify-between mb-3">
          {item.author && (
            <View className="flex-row items-center">
              <Ionicons name="person-outline" size={14} color="#6B7280" />
              <Text className="text-gray-500 text-xs ml-1" numberOfLines={1}>
                {item.author}
              </Text>
            </View>
          )}
          
          {item.engagement && (
            <View className="flex-row items-center space-x-3">
              {item.engagement.likes && (
                <View className="flex-row items-center">
                  <Ionicons name="heart-outline" size={14} color="#EF4444" />
                  <Text className="text-gray-500 text-xs ml-1">
                    {item.engagement.likes}
                  </Text>
                </View>
              )}
              {item.engagement.comments && (
                <View className="flex-row items-center">
                  <Ionicons name="chatbubble-outline" size={14} color="#3B82F6" />
                  <Text className="text-gray-500 text-xs ml-1">
                    {item.engagement.comments}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        
        {/* Footer con acciones */}
        <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
          <View className="flex-row items-center space-x-4">
            {/* Fecha */}
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text className="text-gray-400 text-xs ml-1">
                {new Date(item.timestamp).toLocaleDateString()}
              </Text>
            </View>
            
            {/* Indicador de plataforma */}
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getPlatformColor() }} />
              <Text className="text-gray-400 text-xs">
                {item.platform === 'generic' ? item.domain : item.platform}
              </Text>
            </View>
          </View>
          
          {/* Acciones */}
          <View className="flex-row items-center space-x-2">
            {/* Botón de favorito */}
            <Pressable
              onPress={onToggleFavorite}
              className="p-2 rounded-full active:bg-gray-100"
            >
              <Ionicons 
                name={item.isFavorite ? "heart" : "heart-outline"} 
                size={20} 
                color={item.isFavorite ? "#EF4444" : "#9CA3AF"} 
              />
            </Pressable>
            
            {/* Botón de eliminar */}
            <Pressable
              onPress={onDelete}
              className="p-2 rounded-full active:bg-gray-100"
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}