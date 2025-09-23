import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

interface LinkProcessingIndicatorProps {
  isProcessing: boolean;
  platform?: string;
  message?: string;
}

export default function LinkProcessingIndicator({ 
  isProcessing, 
  platform = 'generic',
  message = 'Procesando link...'
}: LinkProcessingIndicatorProps) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (isProcessing) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000 }),
        -1,
        false
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    } else {
      rotation.value = withTiming(0, { duration: 300 });
      scale.value = withTiming(1, { duration: 300 });
    }
  }, [isProcessing]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const getPlatformIcon = () => {
    switch (platform) {
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
    switch (platform) {
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

  if (!isProcessing) return null;

  return (
    <View className="bg-white rounded-2xl p-6 border border-gray-200 mb-4">
      <View className="items-center">
        {/* Icono animado */}
        <Animated.View style={animatedStyle} className="mb-4">
          <View 
            className="w-16 h-16 rounded-full items-center justify-center"
            style={{ backgroundColor: getPlatformColor() + '20' }}
          >
            <Text className="text-3xl">{getPlatformIcon()}</Text>
          </View>
        </Animated.View>
        
        {/* Mensaje */}
        <Text className="text-gray-900 font-medium text-base mb-2 text-center">
          {message}
        </Text>
        
        {/* Subtítulo */}
        <Text className="text-gray-500 text-sm text-center">
          Extrayendo miniatura y metadata...
        </Text>
        
        {/* Indicador de progreso */}
        <View className="flex-row items-center mt-4 space-x-1">
          <View className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <View className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <View className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        </View>
      </View>
    </View>
  );
}
