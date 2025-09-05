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
import { getEnhancedCacheStats, clearEnhancedCache, isEnhancedProcessingAvailable } from '../api/enhanced-link-processor';
import { useSavedStore } from '../state/savedStore';

export default function SettingsScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const { connections, toggleConnection } = useSettingsStore();
  const { getQualityStats } = useSavedStore();
  const [cacheStats, setCacheStats] = useState({ size: 0, hitRate: 0 });

  // Filtrar conexiones para excluir Pulqum (ahora manejado por PulseConnectionCard)
  const otherConnections = connections.filter(conn => conn.id !== 'pulqum');

  useEffect(() => {
    // Update cache stats
    const stats = getEnhancedCacheStats();
    setCacheStats(stats);
  }, []);

  const handleClearCache = () => {
    Alert.alert(
      'Limpiar Cache',
      '¿Estás seguro de que quieres limpiar el cache de enlaces? Esto puede hacer que los enlaces se procesen más lentamente la próxima vez.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Limpiar', 
          style: 'destructive',
          onPress: () => {
            clearEnhancedCache();
            setCacheStats({ size: 0, hitRate: 0 });
            Alert.alert('Cache Limpiado', 'El cache de enlaces ha sido limpiado exitosamente.');
          }
        }
      ]
    );
  };

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

        {/* Link Processing Section */}
        <View className="px-5">
          <View className="mb-6">
            <Text className={textStyles.sectionTitle + " mb-2"}>Procesamiento de Enlaces</Text>
            <Text className={textStyles.description}>
              Configuración y estadísticas del sistema de scraping
            </Text>
          </View>
          
          <View className="bg-white rounded-3xl border border-gray-100 mb-8 shadow-sm">
            {/* Enhanced Processing Status */}
            <View className="p-5 border-b border-gray-100">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className={`w-10 h-10 rounded-full items-center justify-center ${
                    isEnhancedProcessingAvailable() ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Ionicons 
                      name={isEnhancedProcessingAvailable() ? "checkmark-circle" : "close-circle"} 
                      size={20} 
                      color={isEnhancedProcessingAvailable() ? "#10B981" : "#6B7280"} 
                    />
                  </View>
                  <View className="ml-4">
                    <Text className={textStyles.bodyText}>Procesamiento Mejorado</Text>
                    <Text className={textStyles.helper + " text-gray-500"}>
                      {isEnhancedProcessingAvailable() ? 'APIs externas configuradas' : 'Solo scraping básico'}
                    </Text>
                  </View>
                </View>
                <View className={`px-3 py-1 rounded-full ${
                  isEnhancedProcessingAvailable() ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Text className={`${textStyles.badge} ${
                    isEnhancedProcessingAvailable() ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {isEnhancedProcessingAvailable() ? 'Activo' : 'Inactivo'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Cache Statistics */}
            <View className="p-5 border-b border-gray-100">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                    <Ionicons name="layers-outline" size={20} color="#3B82F6" />
                  </View>
                  <View className="ml-4">
                    <Text className={textStyles.bodyText}>Cache de Enlaces</Text>
                    <Text className={textStyles.helper + " text-gray-500"}>
                      {cacheStats.size} elementos • {cacheStats.hitRate}% efectividad
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={handleClearCache}
                  className="px-3 py-2 bg-red-50 rounded-full border border-red-200 active:bg-red-100"
                >
                  <Text className={`${textStyles.badge} text-red-700`}>
                    Limpiar
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Quality Statistics */}
            <View className="p-5">
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center">
                  <Ionicons name="analytics-outline" size={20} color="#8B5CF6" />
                </View>
                <View className="ml-4">
                  <Text className={textStyles.bodyText}>Estadísticas de Calidad</Text>
                  <Text className={textStyles.helper + " text-gray-500"}>
                    Enlaces guardados por calidad
                  </Text>
                </View>
              </View>
              
              {(() => {
                const stats = getQualityStats();
                const total = stats.excellent + stats.good + stats.fair + stats.poor;
                
                if (total === 0) {
                  return (
                    <Text className={textStyles.helper + " text-gray-400 text-center py-2"}>
                      No hay enlaces guardados
                    </Text>
                  );
                }
                
                return (
                  <View className="space-y-2">
                    {stats.excellent > 0 && (
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <View className="w-3 h-3 bg-green-500 rounded-full mr-3" />
                          <Text className={textStyles.helper}>Excelente</Text>
                        </View>
                        <Text className={textStyles.helper + " text-gray-600"}>{stats.excellent}</Text>
                      </View>
                    )}
                    {stats.good > 0 && (
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <View className="w-3 h-3 bg-blue-500 rounded-full mr-3" />
                          <Text className={textStyles.helper}>Buena</Text>
                        </View>
                        <Text className={textStyles.helper + " text-gray-600"}>{stats.good}</Text>
                      </View>
                    )}
                    {stats.fair > 0 && (
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <View className="w-3 h-3 bg-yellow-500 rounded-full mr-3" />
                          <Text className={textStyles.helper}>Regular</Text>
                        </View>
                        <Text className={textStyles.helper + " text-gray-600"}>{stats.fair}</Text>
                      </View>
                    )}
                    {stats.poor > 0 && (
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <View className="w-3 h-3 bg-red-500 rounded-full mr-3" />
                          <Text className={textStyles.helper}>Básica</Text>
                        </View>
                        <Text className={textStyles.helper + " text-gray-600"}>{stats.poor}</Text>
                      </View>
                    )}
                  </View>
                );
              })()}
            </View>
          </View>
        </View>

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
            <Text className={textStyles.helper}>vizta v1.0.0</Text>
            <Text className={textStyles.helper + " text-gray-400 mt-1"}>
              © 2025 Vibecode. Todos los derechos reservados.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}