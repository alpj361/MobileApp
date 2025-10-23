import React from 'react';
import { View, Text } from 'react-native';
import MorphLoading from './MorphLoading';
import { textStyles } from '../utils/typography';

interface LoadingItemCardProps {
  url: string;
}

export default function LoadingItemCard({ url }: LoadingItemCardProps) {
  // Extract domain from URL for display
  const getDomain = (urlString: string) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Procesando...';
    }
  };

  return (
    <View className="bg-white rounded-3xl p-6 mb-4 shadow-sm border border-gray-100">
      {/* Loading Animation Container */}
      <View className="items-center justify-center py-8">
        <MorphLoading size="md" />
        <Text className={`${textStyles.helper} text-gray-500 mt-4`}>
          Procesando enlace...
        </Text>
        <Text className={`${textStyles.badge} text-gray-400 mt-1`} numberOfLines={1}>
          {getDomain(url)}
        </Text>
      </View>
    </View>
  );
}

