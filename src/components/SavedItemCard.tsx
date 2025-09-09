import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { SavedItem } from '../state/savedStore';
import { textStyles } from '../utils/typography';
import { usePulseConnectionStore } from '../state/pulseConnectionStore';
import { useCodexStatusStore } from '../state/codexStatusStore';
import { saveLinkToCodex } from '../services/codexService';

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
  const { isConnected, connectedUser } = usePulseConnectionStore();
  const { getCodexStatus, setCodexStatus } = useCodexStatusStore();
  const [isCheckingCodex, setIsCheckingCodex] = useState(false);

  // Get the current codex status from the persistent store
  const codexStatus = getCodexStatus(item.url);
  const isSavedInCodex = codexStatus.exists;

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
        return 'Del Chat';
      case 'clipboard':
        return 'Del Portapapeles';
      case 'manual':
        return 'Manual';
      default:
        return 'Fuente Desconocida';
    }
  };


  return (
    <Pressable
      onPress={handlePress}
      className="bg-white rounded-3xl overflow-hidden border border-gray-100 active:bg-gray-50 mb-4 shadow-sm"
      style={({ pressed }) => [
        {
          transform: [{ scale: pressed ? 0.98 : 1 }],
        }
      ]}
    >
      {/* Header con plataforma y fuente */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-100">
        <View className="flex-row items-center">
          <Text className="text-xl mr-3">{getPlatformIcon()}</Text>
          <View>
            <Text className={`${textStyles.badge} text-gray-700 uppercase tracking-wide`}>
              {item.platform === 'generic' ? item.domain : item.platform}
            </Text>
          </View>
        </View>
        
        <View className="flex-row items-center gap-2">
          {/* Indicador de guardado en Codex */}
          {isConnected && isSavedInCodex && (
            <View className="flex-row items-center px-2 py-1 rounded-full bg-green-100">
              <Ionicons name="checkmark-circle" size={12} color="#10B981" />
              <Text className={`${textStyles.helper} font-medium text-green-700 ml-1`}>
                En Codex
              </Text>
            </View>
          )}
          
          {/* Indicador de fuente */}
          <View className="flex-row items-center bg-gray-100 px-2 py-1 rounded-full">
            <Ionicons 
              name={getSourceIcon() as any} 
              size={12} 
              color={getSourceColor()} 
            />
            <Text className={`${textStyles.helper} text-gray-500 ml-1`}>
              {getSourceLabel()}
            </Text>
          </View>
        </View>
      </View>

      {/* Imagen o placeholder mejorado */}
      {item.image ? (
        <View className="relative">
          <Image
            source={{ uri: item.image }}
            className="w-full h-48"
            resizeMode="cover"
            onError={() => {
              // Handle image loading error silently
              console.log("Image failed to load:", item.image);
            }}
            onLoad={() => {
              // Image loaded successfully
              console.log("Image loaded successfully:", item.image);
            }}
          />
        </View>
      ) : (
        <View className="w-full h-36 bg-gradient-to-br from-gray-100 to-gray-200 flex-row items-center justify-center">
          <View className="items-center">
            <Text className="text-5xl mb-3 opacity-60">{getPlatformIcon()}</Text>
            <Text className={`${textStyles.helper} text-gray-500`}>Sin miniatura disponible</Text>
          </View>
        </View>
      )}
      
      {/* Contenido mejorado */}
      <View className="p-5">
        {/* Título con indicador de fuente */}
        <View className="flex-row items-start justify-between mb-3">
          <Text className={`${textStyles.cardTitle} flex-1 mr-2`} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        
        {/* Descripción mejorada */}
        {item.description && item.description !== 'No description available' && item.description !== 'Vista previa no disponible' ? (
          <Text className={`${textStyles.description} mb-4`} numberOfLines={3}>
            {item.description}
          </Text>
        ) : (
          <Text className={`${textStyles.helper} text-gray-400 mb-4 italic`}>
            Descripción no disponible
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
        
        {/* Footer mejorado con más información */}
        <View className="pt-4 border-t border-gray-100">
          {/* Información de procesamiento */}
          {/* Información secundaria removida para UI más limpia */}
          
          {/* Fila principal del footer */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              {/* Fecha */}
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                <Text className={`${textStyles.helper} text-gray-400 ml-1`}>
                  {new Date(item.timestamp).toLocaleDateString()}
                </Text>
              </View>
              
              {/* Indicador de plataforma */}
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getPlatformColor() }} />
                <Text className={`${textStyles.helper} text-gray-400`}>
                  {item.platform === 'generic' ? item.domain : item.platform}
                </Text>
              </View>
            </View>
            
            {/* Acciones */}
            <View className="flex-row items-center gap-2">
              {/* Guardar en Codex (sólo si conectado a Pulse Journal) */}
              {isConnected && connectedUser?.id && (
                <Pressable
                  onPress={async () => {
                    if (isSavedInCodex) {
                      Alert.alert('Ya guardado', 'Este enlace ya está guardado en tu Codex.');
                      return;
                    }

                    try {
                      const res = await saveLinkToCodex(connectedUser.id, item);
                      if (res.success) {
                        // Update persistent store to show as saved
                        setCodexStatus(item.url, { exists: true, id: res.id });
                        
                        // Check if it's a duplicate message
                        if (res.error && res.error.includes('ya está guardado')) {
                          Alert.alert('Ya guardado', res.error);
                        } else {
                          Alert.alert('Guardado en Codex', 'El enlace se guardó correctamente.');
                        }
                      } else {
                        Alert.alert('Error', res.error || 'No se pudo guardar en Codex');
                      }
                    } catch (e) {
                      Alert.alert('Error', 'No se pudo guardar en Codex');
                    }
                  }}
                  className="p-2 rounded-full active:bg-gray-100"
                  style={({ pressed }) => [
                    {
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    }
                  ]}
                  disabled={isCheckingCodex}
                >
                  {isCheckingCodex ? (
                    <Ionicons name="hourglass-outline" size={20} color="#9CA3AF" />
                  ) : isSavedInCodex ? (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  ) : (
                    <Ionicons name="save-outline" size={20} color="#3B82F6" />
                  )}
                </Pressable>
              )}
              {/* Botón de favorito */}
              <Pressable
                onPress={onToggleFavorite}
                className="p-2 rounded-full active:bg-gray-100"
                style={({ pressed }) => [
                  {
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  }
                ]}
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
                style={({ pressed }) => [
                  {
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  }
                ]}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}