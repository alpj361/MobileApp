import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { usePulseConnectionStore } from '../state/pulseConnectionStore';
import { isValidEmail } from '../services/pulseAuth';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import AnimatedCircle from './AnimatedCircle';

export default function PulseConnectionCard() {
  const {
    isConnected,
    isConnecting,
    connectionError,
    connectedUser,
    connectionMethod,
    connectedAt,
    setConnectionResult,
    setConnecting,
    connectWithEmail,
    disconnect,
    clearError,
  } = usePulseConnectionStore();

  const { connectWithGoogle: googleAuth, isReady } = useGoogleAuth();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Animaciones
  const cardScale = useSharedValue(1);
  const formOpacity = useSharedValue(0);
  const formHeight = useSharedValue(0);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const animatedFormStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    height: formHeight.value,
  }));

  // Manejar press del card principal
  const handleCardPress = () => {
    cardScale.value = withSpring(0.98, { damping: 15 }, () => {
      cardScale.value = withSpring(1, { damping: 15 });
    });
  };

  // Conectar con Google
  const handleGoogleConnect = async () => {
    handleCardPress();
    clearError();
    
    if (!isReady) {
      setConnectionResult({
        success: false,
        error: 'La solicitud de autenticación no está lista. Intenta de nuevo.'
      }, 'google');
      return;
    }
    
    setConnecting(true);
    
    try {
      const result = await googleAuth();
      setConnectionResult(result, 'google');
    } catch (error) {
      setConnectionResult({
        success: false,
        error: 'Error inesperado durante la conexión con Google'
      }, 'google');
    }
  };

  // Mostrar/ocultar formulario de email
  const toggleEmailForm = () => {
    const newValue = !showEmailForm;
    setShowEmailForm(newValue);
    
    if (newValue) {
      formHeight.value = withTiming(180);
      formOpacity.value = withTiming(1);
    } else {
      formOpacity.value = withTiming(0);
      formHeight.value = withTiming(0);
      setEmail('');
      setPassword('');
    }
  };

  // Conectar con email
  const handleEmailConnect = async () => {
    if (!isValidEmail(email)) {
      Alert.alert('Email inválido', 'Por favor ingresa un email válido.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password muy corto', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    clearError();
    
    try {
      const result = await connectWithEmail(email, password);
      if (result.success) {
        toggleEmailForm(); // Cerrar formulario si la conexión es exitosa
      }
    } catch (error) {
      console.error('Error connecting with email:', error);
    }
  };

  // Desconectar
  const handleDisconnect = () => {
    Alert.alert(
      'Desconectar',
      '¿Estás seguro que quieres desconectar tu cuenta de Pulse Journal?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Desconectar', 
          style: 'destructive',
          onPress: disconnect
        },
      ]
    );
  };

  // Obtener icono según estado
  const getStatusIcon = () => {
    if (isConnecting) return null; // Se muestra AnimatedCircle
    if (isConnected) return 'checkmark-circle';
    return 'link-outline';
  };

  // Obtener color del icono
  const getIconColor = () => {
    if (isConnected) return '#10B981'; // green-500
    return '#6B7280'; // gray-500
  };

  return (
    <Animated.View style={animatedCardStyle}>
      <Pressable onPress={handleCardPress}>
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                isConnected ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {isConnecting ? (
                  <AnimatedCircle
                    isAnimating={true}
                    size={24}
                    color={isConnected ? '#10B981' : '#6B7280'}
                  />
                ) : (
                  <Ionicons 
                    name={getStatusIcon() as any} 
                    size={24} 
                    color={getIconColor()} 
                  />
                )}
              </View>
              
              <View className="flex-1">
                <Text className="text-black font-semibold text-base mb-1">
                  Pulse Journal
                </Text>
                
                {isConnected ? (
                  <View>
                    <Text className="text-gray-600 text-sm">
                      Conectado como {connectedUser?.email}
                    </Text>
                    <Text className="text-green-600 text-xs mt-1">
                      Conectado {connectionMethod === 'google' ? 'con Google' : 'con email'} • {' '}
                      {connectedAt && new Date(connectedAt).toLocaleDateString()}
                    </Text>
                    {connectedUser && (
                      <Text className="text-blue-600 text-xs mt-1">
                        {connectedUser.user_type} • {connectedUser.credits} créditos
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text className="text-gray-600 text-sm">
                    Conecta con tu cuenta de Pulse Journal para sincronizar datos
                  </Text>
                )}
                
                {connectionError && (
                  <Text className="text-red-600 text-xs mt-1" numberOfLines={2}>
                    {connectionError}
                  </Text>
                )}
              </View>
            </View>
            
            {!isConnecting && (
              <View className="ml-2">
                {isConnected ? (
                  <Pressable
                    onPress={handleDisconnect}
                    className="px-4 py-2 rounded-full bg-red-100 border border-red-200"
                  >
                    <Text className="text-red-700 text-sm font-medium">
                      Desconectar
                    </Text>
                  </Pressable>
                ) : (
                  <View className="space-y-2">
                    <Pressable
                      onPress={handleGoogleConnect}
                      className="px-4 py-2 rounded-full bg-blue-500 flex-row items-center"
                    >
                      <Ionicons name="logo-google" size={16} color="white" />
                      <Text className="text-white text-sm font-medium ml-2">
                        Google
                      </Text>
                    </Pressable>
                    
                    <Pressable
                      onPress={toggleEmailForm}
                      className="px-4 py-2 rounded-full bg-gray-500 flex-row items-center"
                    >
                      <Ionicons name="mail" size={16} color="white" />
                      <Text className="text-white text-sm font-medium ml-2">
                        Email
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </View>
          
          {/* Formulario de email animado */}
          <Animated.View style={animatedFormStyle} className="overflow-hidden">
            <View className="mt-4 pt-4 border-t border-gray-100">
              <Text className="text-gray-700 text-sm font-medium mb-3">
                Conectar con Email
              </Text>
              
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-gray-50 rounded-lg px-3 py-2 text-sm mb-3 border border-gray-200"
              />
              
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Contraseña"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-gray-50 rounded-lg px-3 py-2 text-sm mb-3 border border-gray-200"
              />
              
              <View className="flex-row space-x-2">
                <Pressable
                  onPress={handleEmailConnect}
                  className="flex-1 bg-blue-500 rounded-lg py-2"
                >
                  <Text className="text-white text-sm font-medium text-center">
                    Conectar
                  </Text>
                </Pressable>
                
                <Pressable
                  onPress={toggleEmailForm}
                  className="flex-1 bg-gray-200 rounded-lg py-2"
                >
                  <Text className="text-gray-700 text-sm font-medium text-center">
                    Cancelar
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
