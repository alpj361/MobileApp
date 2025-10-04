import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { textStyles } from '../utils/typography';
import { SavedItem } from '../state/savedStore';

interface InstagramAnalysisModalProps {
  visible: boolean;
  onClose: () => void;
  analysis?: SavedItem['analysisInfo'];
  onRefresh?: () => void;
}

export default function InstagramAnalysisModal({
  visible,
  onClose,
  analysis,
  onRefresh,
}: InstagramAnalysisModalProps) {
  const isLoading = analysis?.loading;
  const hasError = !!analysis?.error && !analysis?.loading;
  const hasData = !isLoading && !hasError && (analysis?.summary || analysis?.transcript || analysis?.images?.length);

  const handleCopy = async (text?: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    Alert.alert('Copiado', 'El contenido se copió al portapapeles.');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View className="flex-1 bg-gray-50">
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
          <View>
            <Text className={`${textStyles.sectionTitle} text-gray-900`}>Análisis del post</Text>
            {analysis?.type && (
              <Text className={`${textStyles.description} text-gray-500`}>Tipo: {analysis.type}</Text>
            )}
          </View>
          <View className="flex-row items-center gap-2">
            {onRefresh && (
              <Pressable
                onPress={() => onRefresh()}
                disabled={isLoading}
                className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Ionicons name="refresh" size={16} color="#3B82F6" />
                )}
              </Pressable>
            )}
            <Pressable onPress={onClose} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
              <Ionicons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : hasError ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="warning-outline" size={28} color="#F59E0B" />
            <Text className={`${textStyles.cardTitle} text-gray-900 mt-3`}>No se pudo analizar el post</Text>
            <Text className={`${textStyles.description} text-center text-gray-500 mt-2`}>
              {analysis?.error || 'Intenta de nuevo más tarde.'}
            </Text>
            {onRefresh && (
              <Pressable
                onPress={() => onRefresh()}
                className="mt-4 px-4 py-2 bg-blue-500 rounded-full"
              >
                <Text className={`${textStyles.buttonText} text-white`}>Reintentar</Text>
              </Pressable>
            )}
          </View>
        ) : hasData ? (
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {analysis?.summary && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className={`${textStyles.cardTitle} text-gray-900`}>Resumen</Text>
                  <Pressable onPress={() => handleCopy(analysis.summary)}>
                    <Text className={`${textStyles.helper} text-blue-600`}>Copiar</Text>
                  </Pressable>
                </View>
                <Text className={`${textStyles.bodyText} text-gray-700`}>
                  {analysis.summary}
                </Text>
              </View>
            )}

            {analysis?.transcript && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className={`${textStyles.cardTitle} text-gray-900`}>Transcripción</Text>
                  <Pressable onPress={() => handleCopy(analysis.transcript)}>
                    <Text className={`${textStyles.helper} text-blue-600`}>Copiar</Text>
                  </Pressable>
                </View>
                <Text className={`${textStyles.bodyText} text-gray-700`}>
                  {analysis.transcript}
                </Text>
              </View>
            )}

            {analysis?.images && analysis.images.length > 0 && (
              <View className="mb-6">
                <Text className={`${textStyles.cardTitle} text-gray-900 mb-3`}>Descripción visual</Text>
                {analysis.images.map((image, idx) => (
                  <View key={image.url} className="mb-3">
                    <Text className={`${textStyles.badge} text-gray-500 mb-1`}>
                      Imagen {idx + 1}
                    </Text>
                    <Text className={`${textStyles.bodyText} text-gray-700`}>
                      {image.description}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center px-6">
            <Text className={`${textStyles.cardTitle} text-gray-900 mb-2`}>Sin datos de análisis</Text>
            <Text className={`${textStyles.description} text-center text-gray-500`}>
              Toca “Actualizar” para generar la transcripción o descripción de este post.
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
