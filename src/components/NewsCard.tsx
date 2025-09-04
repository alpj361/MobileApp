import React from 'react';
import { View, Text, Pressable, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NewsItem } from '../config/supabase';
import { textStyles } from '../utils/typography';

interface NewsCardProps {
  item: NewsItem;
  onPress?: () => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ item, onPress }) => {
  
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'política':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          border: 'border-red-200'
        };
      case 'economía':
      case 'economia':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          border: 'border-green-200'
        };
      case 'deportes':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          border: 'border-blue-200'
        };
      case 'entretenimiento':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-700',
          border: 'border-purple-200'
        };
      case 'tecnología':
      case 'tecnologia':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          border: 'border-gray-200'
        };
      case 'sociedad':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-700',
          border: 'border-yellow-200'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          border: 'border-gray-200'
        };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'política':
        return 'business';
      case 'economía':
      case 'economia':
        return 'trending-up';
      case 'deportes':
        return 'football';
      case 'entretenimiento':
        return 'film';
      case 'tecnología':
      case 'tecnologia':
        return 'hardware-chip';
      case 'sociedad':
        return 'people';
      default:
        return 'newspaper';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) {
        return 'Hace menos de 1 hora';
      } else if (diffInHours < 24) {
        return `Hace ${diffInHours} hora${diffInHours !== 1 ? 's' : ''}`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
          return `Hace ${diffInDays} día${diffInDays !== 1 ? 's' : ''}`;
        } else {
          return date.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
          });
        }
      }
    } catch (error) {
      return 'Fecha no disponible';
    }
  };

  const handleOpenLink = async () => {
    if (!item.url) {
      Alert.alert('Error', 'Esta noticia no tiene enlace disponible');
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(item.url);
      if (canOpen) {
        await Linking.openURL(item.url);
      } else {
        Alert.alert('Error', 'No se puede abrir el enlace');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al abrir el enlace');
    }
  };

  const categoryColors = getCategoryColor(item.category);
  const categoryIcon = getCategoryIcon(item.category);

  return (
    <Pressable 
      className="bg-white rounded-3xl p-5 mb-4 border border-gray-100 active:bg-gray-50 shadow-sm"
      onPress={onPress || handleOpenLink}
    >
      {/* Header con categoría y fuente */}
      <View className="flex-row items-center justify-between mb-4">
        <View className={`flex-row items-center px-3 py-1.5 rounded-full ${categoryColors.bg} ${categoryColors.border} border`}>
          <Ionicons 
            name={categoryIcon as any} 
            size={14} 
            color={categoryColors.text.includes('red') ? '#B91C1C' :
                   categoryColors.text.includes('green') ? '#047857' :
                   categoryColors.text.includes('blue') ? '#1D4ED8' :
                   categoryColors.text.includes('purple') ? '#7C3AED' :
                   categoryColors.text.includes('yellow') ? '#A16207' :
                   '#374151'} 
          />
          <Text className={`ml-2 ${textStyles.badge} ${categoryColors.text}`}>
            {item.category}
          </Text>
        </View>
        
        <View className="flex-row items-center">
          <Ionicons name="business" size={14} color="#9CA3AF" />
          <Text className={`${textStyles.helper} ml-2`} numberOfLines={1}>
            {item.source}
          </Text>
        </View>
      </View>

      {/* Título */}
      <Text className={`${textStyles.cardTitle} mb-3`} numberOfLines={3}>
        {item.title}
      </Text>

      {/* Descripción */}
      <Text className={`${textStyles.description} mb-4`} numberOfLines={3}>
        {item.excerpt}
      </Text>

      {/* Footer con fecha y acción */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="time" size={14} color="#9CA3AF" />
          <Text className={`${textStyles.timestamp} ml-2`}>
            {formatDate(item.date)}
          </Text>
        </View>

        {item.url && (
          <Pressable 
            className="flex-row items-center px-3 py-2 bg-blue-50 rounded-full border border-blue-200 active:bg-blue-100"
            onPress={handleOpenLink}
          >
            <Text className={`${textStyles.badge} text-blue-600 mr-2`}>
              Leer más
            </Text>
            <Ionicons name="open-outline" size={14} color="#2563EB" />
          </Pressable>
        )}
      </View>

      {/* Keywords (si existen) */}
      {item.keywords && item.keywords.length > 0 && (
        <View className="flex-row flex-wrap mt-4 pt-4 border-t border-gray-100 gap-2">
          {item.keywords.slice(0, 3).map((keyword, index) => (
            <View 
              key={index} 
              className="bg-gray-100 px-3 py-1.5 rounded-full"
            >
              <Text className={textStyles.badge + " text-gray-600"}>
                {keyword}
              </Text>
            </View>
          ))}
          {item.keywords.length > 3 && (
            <View className="bg-gray-100 px-3 py-1.5 rounded-full">
              <Text className={textStyles.badge + " text-gray-600"}>
                +{item.keywords.length - 3}
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
};

export default NewsCard;
