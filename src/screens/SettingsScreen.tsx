import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../components/CustomHeader';
import { useSettingsStore, ConnectionStatus } from '../state/settingsStore';

export default function SettingsScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { connections, toggleConnection } = useSettingsStore();

  const renderConnectionItem = (connection: ConnectionStatus) => {
    const handleToggle = () => {
      toggleConnection(connection.id);
    };

    return (
      <View key={connection.id} className="bg-white rounded-2xl p-4 mb-3 border border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
              connection.isConnected ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <Ionicons 
                name={connection.isConnected ? 'checkmark-circle' : connection.icon as any} 
                size={24} 
                color={connection.isConnected ? '#3B82F6' : '#6B7280'} 
              />
            </View>
            <View className="flex-1">
              <Text className="text-black font-semibold text-base mb-1">
                {connection.name}
              </Text>
              {connection.description && (
                <Text className="text-gray-600 text-sm" numberOfLines={2}>
                  {connection.description}
                </Text>
              )}
              {connection.isConnected && connection.lastConnected && (
                <Text className="text-green-600 text-xs mt-1">
                  Conectado • {new Date(connection.lastConnected).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
          <Pressable
            onPress={handleToggle}
            className={`px-4 py-2 rounded-full ${
              connection.isConnected 
                ? 'bg-red-100 border border-red-200' 
                : 'bg-blue-500'
            }`}
          >
            <Text className={`text-sm font-medium ${
              connection.isConnected ? 'text-red-700' : 'text-white'
            }`}>
              {connection.isConnected ? 'Desconectar' : 'Conectar'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-100" style={{ paddingTop: insets.top }}>
      <CustomHeader navigation={navigation} title="Configuración" />
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Conexiones Section */}
        <View className="px-4 pt-4">
          <View className="mb-4">
            <Text className="text-black text-lg font-semibold mb-1">Conexiones</Text>
            <Text className="text-gray-600 text-sm">
              Gestiona las conexiones con servicios externos
            </Text>
          </View>
          
          <View className="mb-6">
            {connections.map(renderConnectionItem)}
          </View>
        </View>

        {/* General Section */}
        <View className="px-4">
          <View className="mb-4">
            <Text className="text-black text-lg font-semibold mb-1">General</Text>
            <Text className="text-gray-600 text-sm">
              Configuración general de la aplicación
            </Text>
          </View>
          
          <View className="bg-white rounded-2xl border border-gray-200 mb-6">
            <Pressable className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="notifications-outline" size={24} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-700">Notificaciones</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
            
            <Pressable className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="shield-outline" size={24} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-700">Privacidad</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
            
            <Pressable className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center">
                <Ionicons name="information-circle-outline" size={24} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-700">Acerca de</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
          </View>
        </View>

        {/* App Info */}
        <View className="px-4 pb-8">
          <View className="items-center">
            <Text className="text-gray-500 text-sm">vizta v1.0.0</Text>
            <Text className="text-gray-400 text-xs mt-1">
              © 2025 Vibecode. Todos los derechos reservados.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}