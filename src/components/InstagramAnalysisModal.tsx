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
import BulletRow from './BulletRow';
import { parseSummary } from '../utils/parseSummary';

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
  const parsedSummary = parseSummary(analysis?.summary);
  const [transcriptExpanded, setTranscriptExpanded] = React.useState(false);

  const handleCopy = async (text?: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    Alert.alert('Copiado', 'El contenido se copió al portapapeles.');
  };

  React.useEffect(() => {
    if (!visible) {
      setTranscriptExpanded(false);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View className="flex-1 bg-gray-50">
        <View className="px-5 pt-5 pb-4 border-b border-gray-200 bg-white">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className={`${textStyles.cardTitleLarge} text-gray-900`}>Análisis del post</Text>
              <View className="flex-row items-center gap-2 mt-2">
                {analysis?.type && (
                  <View className="px-2 py-1 rounded-full bg-blue-50">
                    <Text className={`${textStyles.helper} text-blue-600 capitalize`}>{analysis.type}</Text>
                  </View>
                )}
                {analysis?.lastUpdated && (
                  <Text className={`${textStyles.timestamp}`}>
                    Últ. act.: {new Date(analysis.lastUpdated).toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              {onRefresh && (
                <Pressable
                  onPress={() => onRefresh()}
                  disabled={isLoading}
                  className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center"
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
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
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
            {parsedSummary.bullets.length > 0 && (
              <View className="mb-5 p-5 rounded-3xl bg-white shadow-sm border border-gray-100">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className={`${textStyles.cardTitle} text-gray-900`}>Resumen</Text>
                  <Pressable onPress={() => handleCopy(analysis?.summary)}>
                    <Text className={`${textStyles.helper} text-blue-600`}>Copiar</Text>
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
                  <View className="mt-1 pt-3 border-t border-gray-100">
                    <Text className={`${textStyles.helper} text-gray-500 uppercase mb-1`}>TL;DR</Text>
                    <Text className={`${textStyles.bodyText} text-gray-700 leading-6`}>{parsedSummary.tldr}</Text>
                  </View>
                )}
              </View>
            )}

            {analysis?.transcript && (
              <View className="mb-5 p-5 rounded-3xl bg-white shadow-sm border border-gray-100">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className={`${textStyles.cardTitle} text-gray-900`}>Transcripción</Text>
                  <View className="flex-row items-center gap-3">
                    <Pressable onPress={() => handleCopy(analysis.transcript)}>
                      <Text className={`${textStyles.helper} text-blue-600`}>Copiar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setTranscriptExpanded((prev) => !prev)}
                      className="px-3 py-1 rounded-full bg-gray-100"
                    >
                      <Text className={`${textStyles.helper} text-gray-600`}>
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

            {analysis?.images && analysis.images.length > 0 && (
              <View className="mb-5 p-5 rounded-3xl bg-white shadow-sm border border-gray-100">
                <Text className={`${textStyles.cardTitle} text-gray-900 mb-3`}>Descripción visual</Text>
                {analysis.images.slice(0, 3).map((image, idx) => (
                  <BulletRow
                    key={image.url}
                    icon="🖼️"
                    emphasis={`Imagen ${idx + 1}.`}
                    text={image.description}
                  />
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
