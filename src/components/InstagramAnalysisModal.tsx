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
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { textStyles } from '../utils/typography';
import { SavedItem } from '../state/savedStore';
import BulletRow from './BulletRow';
import InfoCard from './InfoCard';
import { parseSummary } from '../utils/parseSummary';

interface InstagramAnalysisModalProps {
  visible: boolean;
  onClose: () => void;
  analysis?: SavedItem['analysisInfo'];
  onRefresh?: () => void;
  platform?: string;
  url?: string;
}

export default function InstagramAnalysisModal({
  visible,
  onClose,
  analysis,
  onRefresh,
  platform = 'instagram',
  url,
}: InstagramAnalysisModalProps) {
  const isLoading = analysis?.loading;
  const hasError = !!analysis?.error && !analysis?.loading;
  const hasData = !isLoading && !hasError && (analysis?.summary || analysis?.transcript || analysis?.images?.length);
  const parsedSummary = parseSummary(analysis?.summary);
  const [transcriptExpanded, setTranscriptExpanded] = React.useState(false);

  const handleCopy = async (text?: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    Alert.alert('Copiado', 'El contenido se copió al portapapeles.');
  };

  const getPlatformInfo = () => {
    switch (platform) {
      case 'instagram':
        return { name: 'Instagram', icon: 'logo-instagram', color: '#E4405F', emoji: '📷' };
      case 'twitter':
        return { name: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2', emoji: '🐦' };
      case 'tiktok':
        return { name: 'TikTok', icon: 'musical-notes', color: '#000000', emoji: '🎵' };
      case 'youtube':
        return { name: 'YouTube', icon: 'logo-youtube', color: '#FF0000', emoji: '▶️' };
      default:
        return { name: 'Post', icon: 'link', color: '#6B7280', emoji: '🔗' };
    }
  };

  const platformInfo = getPlatformInfo();

  const handleOpenOriginal = () => {
    if (url) {
      Linking.openURL(url);
    } else {
      Alert.alert('Error', 'URL no disponible');
    }
  };

  // Mock data for new info cards (backend will provide real data later)
  const topicData = {
    icon: '📁',
    label: 'Tema',
    value: analysis?.topic || 'Sin categorizar',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    iconColor: '#3B82F6'
  };

  const sentimentData = React.useMemo(() => {
    const sentiment = analysis?.sentiment || 'neutral';
    switch (sentiment.toLowerCase()) {
      case 'positive':
      case 'positivo':
        return {
          icon: '😊',
          label: 'Sentimiento',
          value: 'Positivo',
          backgroundColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          iconColor: '#10B981'
        };
      case 'negative':
      case 'negativo':
        return {
          icon: '😔',
          label: 'Sentimiento',
          value: 'Negativo',
          backgroundColor: '#FEF2F2',
          borderColor: '#FECACA',
          iconColor: '#EF4444'
        };
      default:
        return {
          icon: '😐',
          label: 'Sentimiento',
          value: 'Neutral',
          backgroundColor: '#F3F4F6',
          borderColor: '#D1D5DB',
          iconColor: '#6B7280'
        };
    }
  }, [analysis?.sentiment]);

  const postTypeData = {
    icon: analysis?.type === 'video' ? '🎥' : analysis?.type === 'carousel' ? '🔄' : '📸',
    label: 'Tipo',
    value: analysis?.type === 'video' ? 'Video' : analysis?.type === 'carousel' ? 'Carrusel' : 'Foto',
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    iconColor: '#7C3AED'
  };

  const getReadingTime = (text?: string) => {
    if (!text) return '';
    const words = text.split(/\s+/).length;
    const minutes = Math.ceil(words / 200); // Average reading speed
    return `~${minutes} min lectura`;
  };

  React.useEffect(() => {
    if (!visible) {
      setTranscriptExpanded(false);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View className="flex-1 bg-gray-50">
        {/* Enhanced Header */}
        <View className="px-5 pt-5 pb-4 border-b border-gray-200 bg-white">
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1 pr-4">
              <Text className={`${textStyles.cardTitleLarge} text-gray-900 mb-2`}>Análisis del post</Text>
              <View className="flex-row items-center gap-2">
                {/* Platform Chip */}
                <View 
                  className="px-3 py-1.5 rounded-full flex-row items-center"
                  style={{ backgroundColor: `${platformInfo.color}15`, borderWidth: 1, borderColor: `${platformInfo.color}40` }}
                >
                  <Text className="text-base mr-1">{platformInfo.emoji}</Text>
                  <Text className={`${textStyles.badge} font-medium`} style={{ color: platformInfo.color }}>
                    {platformInfo.name}
                  </Text>
                </View>
                {/* Last Updated */}
                {analysis?.lastUpdated && (
                  <Text className={`${textStyles.timestamp}`}>
                    {new Date(analysis.lastUpdated).toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              {onRefresh && (
                <Pressable
                  onPress={() => onRefresh()}
                  disabled={isLoading}
                  className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center border border-blue-200"
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <Ionicons name="refresh" size={18} color="#2563EB" />
                  )}
                </Pressable>
              )}
              <Pressable onPress={onClose} className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
                <Ionicons name="close" size={22} color="#4B5563" />
              </Pressable>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View className="flex-row items-center gap-2 mt-2">
            <Pressable
              onPress={handleOpenOriginal}
              className="flex-row items-center px-4 py-2.5 rounded-full bg-black border border-gray-900"
              style={({ pressed }) => [
                { transform: [{ scale: pressed ? 0.95 : 1 }] }
              ]}
            >
              <Ionicons name={platformInfo.icon as any} size={16} color="white" />
              <Text className={`${textStyles.badge} text-white ml-2 font-medium`}>
                Abrir en {platformInfo.name}
              </Text>
            </Pressable>

            <Pressable
              className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center border border-gray-200"
              style={({ pressed }) => [
                { transform: [{ scale: pressed ? 0.95 : 1 }] }
              ]}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color="#6B7280" />
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text className={`${textStyles.description} text-gray-500 mt-4`}>
              Analizando contenido...
            </Text>
          </View>
        ) : hasError ? (
          <View className="flex-1 items-center justify-center px-6">
            <View className="px-6 py-5 bg-white rounded-2xl shadow-sm border border-gray-100">
              <View className="items-center mb-3">
                <Ionicons name="warning-outline" size={30} color="#F59E0B" />
                <Text className={`${textStyles.cardTitle} text-gray-900 mt-3`}>No se pudo analizar el post</Text>
              </View>
              <Text className={`${textStyles.description} text-center text-gray-500`}>
                {analysis?.error || 'Intenta de nuevo más tarde.'}
              </Text>
              {onRefresh && (
                <Pressable
                  onPress={() => onRefresh()}
                  className="mt-4 px-4 py-2 bg-blue-500 rounded-full self-center"
                >
                  <Text className={`${textStyles.buttonText} text-white`}>Reintentar</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : hasData ? (
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {/* Info Cards Section */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="mb-5"
              contentContainerStyle={{ gap: 12 }}
            >
              <InfoCard {...topicData} />
              <InfoCard {...sentimentData} />
              <InfoCard {...postTypeData} />
            </ScrollView>

            {/* Summary Section */}
            {parsedSummary.bullets.length > 0 && (
              <View className="mb-5 p-5 rounded-3xl bg-white shadow-md border border-gray-100">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-purple-100 items-center justify-center mr-3">
                      <Text className="text-lg">💡</Text>
                    </View>
                    <Text className={`${textStyles.cardTitle} text-gray-900`}>Resumen</Text>
                  </View>
                  <Pressable 
                    onPress={() => handleCopy(analysis?.summary)}
                    className="flex-row items-center px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200"
                  >
                    <Ionicons name="copy-outline" size={14} color="#3B82F6" />
                    <Text className={`${textStyles.helper} text-blue-600 ml-1 font-medium`}>Copiar</Text>
                  </Pressable>
                </View>
                {parsedSummary.bullets.map((bullet, index) => (
                  <BulletRow
                    key={`${bullet.emphasis || bullet.text}-${index}`}
                    icon={bullet.icon}
                    emphasis={bullet.emphasis}
                    text={bullet.text}
                  />
                ))}
                {parsedSummary.tldr && (
                  <View className="mt-4 pt-4 border-t border-gray-100">
                    <View className="px-4 py-3 rounded-2xl bg-purple-50 border border-purple-200">
                      <Text className={`${textStyles.badge} text-purple-700 uppercase mb-2 font-semibold tracking-wide`}>
                        TL;DR
                      </Text>
                      <Text className={`${textStyles.bodyText} text-gray-800 leading-6`}>{parsedSummary.tldr}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Transcript Section */}
            {analysis?.transcript && (
              <View className="mb-5 p-5 rounded-3xl bg-white shadow-md border border-gray-100">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                      <Text className="text-lg">🎤</Text>
                    </View>
                    <View>
                      <Text className={`${textStyles.cardTitle} text-gray-900`}>Transcripción</Text>
                      {getReadingTime(analysis.transcript) && (
                        <Text className={`${textStyles.helper} text-gray-400`}>
                          {getReadingTime(analysis.transcript)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Pressable 
                      onPress={() => handleCopy(analysis.transcript)}
                      className="flex-row items-center px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200"
                    >
                      <Ionicons name="copy-outline" size={14} color="#3B82F6" />
                      <Text className={`${textStyles.helper} text-blue-600 ml-1 font-medium`}>Copiar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setTranscriptExpanded((prev) => !prev)}
                      className="px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200"
                    >
                      <Text className={`${textStyles.helper} text-gray-700 font-medium`}>
                        {transcriptExpanded ? 'Ver menos' : 'Ver más'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <Text
                  className={`${textStyles.bodyText} text-gray-700 leading-6`}
                  numberOfLines={transcriptExpanded ? undefined : 6}
                >
                  {analysis.transcript}
                </Text>
              </View>
            )}

            {/* Visual Description Section */}
            {analysis?.images && analysis.images.length > 0 && (
              <View className="mb-5 p-5 rounded-3xl bg-white shadow-md border border-gray-100">
                <View className="flex-row items-center mb-4">
                  <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center mr-3">
                    <Text className="text-lg">🖼️</Text>
                  </View>
                  <Text className={`${textStyles.cardTitle} text-gray-900`}>Descripción visual</Text>
                </View>
                {analysis.images.slice(0, 3).map((image, idx) => (
                  <View key={image.url} className="mb-3 last:mb-0">
                    <View className="flex-row items-start p-3 rounded-2xl bg-gray-50 border border-gray-200">
                      <View className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 items-center justify-center mr-3">
                        <Text className={`${textStyles.badge} font-bold text-gray-700`}>{idx + 1}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className={`${textStyles.badge} text-gray-500 uppercase mb-1`}>Imagen {idx + 1}</Text>
                        <Text className={`${textStyles.bodyText} text-gray-800`}>{image.description}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center px-6">
            <View className="w-20 h-20 bg-gray-200 rounded-full items-center justify-center mb-4">
              <Ionicons name="document-text-outline" size={32} color="#9CA3AF" />
            </View>
            <Text className={`${textStyles.cardTitle} text-gray-900 mb-2`}>Sin datos de análisis</Text>
            <Text className={`${textStyles.description} text-center text-gray-500`}>
              Toca "Actualizar" para generar la transcripción o descripción de este post.
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}