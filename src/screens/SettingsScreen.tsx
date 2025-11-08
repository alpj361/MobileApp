import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../components/CustomHeader';
import PulseConnectionCard from '../components/PulseConnectionCard';
import { useSettingsStore, ConnectionStatus } from '../state/settingsStore';
import { textStyles } from '../utils/typography';
import { getCurrentSpacing } from '../utils/responsive';
// Removed link processing configuration imports

export default function SettingsScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const { connections, toggleConnection } = useSettingsStore();
  // Link processing configuration removed

  // Filtrar conexiones para excluir Pulqum (ahora manejado por PulseConnectionCard)
  const otherConnections = connections.filter(conn => conn.id !== 'pulqum');

  // Link processing stats removed

  // Clear cache handler removed

  const renderConnectionItem = (connection: ConnectionStatus) => {
    const handleToggle = () => {
      toggleConnection(connection.id);
    };

    return (
      <View key={connection.id} className="bg-white rounded-3xl p-5 mb-4 border border-gray-100 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className={`w-14 h-14 rounded-full items-center justify-center mr-4 ${
              connection.isConnected ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <Ionicons 
                name={connection.isConnected ? 'checkmark-circle' : connection.icon as any} 
                size={26} 
                color={connection.isConnected ? '#3B82F6' : '#6B7280'} 
              />
            </View>
            <View className="flex-1">
              <Text className={textStyles.cardTitle + " mb-1"}>
                {connection.name}
              </Text>
              {connection.description && (
                <Text className={textStyles.description + " mb-1"} numberOfLines={2}>
                  {connection.description}
                </Text>
              )}
              {connection.isConnected && connection.lastConnected && (
                <Text className={textStyles.badge + " text-green-600"}>
                  Conectado • {new Date(connection.lastConnected).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
          <Pressable
            onPress={handleToggle}
            className={`px-4 py-2.5 rounded-full ${
              connection.isConnected 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-blue-500'
            }`}
          >
            <Text className={`${textStyles.badge} ${
              connection.isConnected ? 'text-red-700' : 'text-white'
            }`}>
              {connection.isConnected ? 'Desconectar' : 'Conectar'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const spacing = getCurrentSpacing();
  
  return (
    <View className="flex-1 bg-gray-50">
      <CustomHeader navigation={navigation} title="Configuración" />
      
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.section }}
      >
        {/* Conexiones Section */}
        <View className="px-5 pt-6">
          <View className="mb-6">
            <Text className={textStyles.sectionTitle + " mb-2"}>Conexiones</Text>
            <Text className={textStyles.description}>
              Gestiona las conexiones con servicios externos
            </Text>
          </View>
          
          <View className="mb-8">
            {/* Conexión principal con Pulse Journal */}
            <PulseConnectionCard />
            
            {/* Otras conexiones si las hay */}
            {otherConnections.map(renderConnectionItem)}
          </View>
        </View>

        {/* Link Processing Section removed */}

        {/* General Section */}
        <View className="px-5">
          <View className="mb-6">
            <Text className={textStyles.sectionTitle + " mb-2"}>General</Text>
            <Text className={textStyles.description}>
              Configuración general de la aplicación
            </Text>
          </View>
          
          <View className="bg-white rounded-3xl border border-gray-100 mb-8 shadow-sm">
            <Pressable className="flex-row items-center justify-between p-5 border-b border-gray-100 active:bg-gray-50">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                  <Ionicons name="notifications-outline" size={20} color="#6B7280" />
                </View>
                <Text className={textStyles.bodyText + " ml-4"}>Notificaciones</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
            
            <Pressable className="flex-row items-center justify-between p-5 border-b border-gray-100 active:bg-gray-50">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                  <Ionicons name="shield-outline" size={20} color="#6B7280" />
                </View>
                <Text className={textStyles.bodyText + " ml-4"}>Privacidad</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
            
            <Pressable className="flex-row items-center justify-between p-5 active:bg-gray-50">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                  <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
                </View>
                <Text className={textStyles.bodyText + " ml-4"}>Acerca de</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
          </View>
        </View>

        {/* App Info */}
        <View className="px-5 pb-8">
          <View className="items-center py-6">
            <Text className={textStyles.helper}>vizta v0.0011</Text>
            <Text className={textStyles.helper + " text-gray-400 mt-1"}>
              © 2025 Vizta. Todos los derechos reservados.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
