import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsConnected, usePulseUser } from '../state/pulseConnectionStore';

interface PulseUserIndicatorProps {
  variant?: 'full' | 'minimal' | 'icon-only';
  showCredits?: boolean;
}

/**
 * Componente para mostrar el estado de conexión con Pulse Journal
 * Útil para header, sidebars o cualquier lugar donde se necesite mostrar el estado
 */
export default function PulseUserIndicator({ 
  variant = 'minimal', 
  showCredits = true 
}: PulseUserIndicatorProps) {
  const isConnected = useIsConnected();
  const user = usePulseUser();

  if (!isConnected || !user) {
    if (variant === 'icon-only') {
      return (
        <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center">
          <Ionicons name="person-outline" size={16} color="#9CA3AF" />
        </View>
      );
    }
    return null;
  }

  // Variante solo icono
  if (variant === 'icon-only') {
    return (
      <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
      </View>
    );
  }

  // Variante minimal
  if (variant === 'minimal') {
    return (
      <View className="flex-row items-center">
        <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
        <Text className="text-gray-700 text-sm font-medium">
          {user.email.split('@')[0]}
        </Text>
        {showCredits && (
          <Text className="text-blue-600 text-xs ml-2">
            {user.credits}c
          </Text>
        )}
      </View>
    );
  }

  // Variante completa
  return (
    <View className="bg-white rounded-lg p-3 border border-gray-200">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
          
          <View className="flex-1">
            <Text className="text-gray-900 font-medium text-sm">
              {user.email}
            </Text>
            <View className="flex-row items-center mt-1">
              <Text className="text-gray-500 text-xs">
                {user.user_type}
              </Text>
              {showCredits && (
                <>
                  <Text className="text-gray-400 text-xs mx-1">•</Text>
                  <Text className="text-blue-600 text-xs">
                    {user.credits} créditos
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
