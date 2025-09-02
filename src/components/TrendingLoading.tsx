import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrendingLoadingProps {
  message?: string;
}

export default function TrendingLoading({ message = 'Cargando tendencias...' }: TrendingLoadingProps) {
  return (
    <View className="flex-1 justify-center items-center bg-gray-100">
      <View className="w-24 h-24 bg-blue-100 rounded-full items-center justify-center mb-6">
        <Ionicons name="trending-up" size={48} color="#3B82F6" />
      </View>
      
      <ActivityIndicator size="large" color="#3B82F6" />
      
      <Text className="text-gray-600 mt-4 text-lg font-medium">
        {message}
      </Text>
      
      <Text className="text-gray-400 mt-2 text-center px-8">
        Analizando las últimas tendencias de Guatemala y el mundo
      </Text>
    </View>
  );
}
