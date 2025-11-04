import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { textStyles } from '../utils/typography';
import { SavedItem } from '../state/savedStore';
import { parseSummary } from '../utils/parseSummary';
import { EntityPanel } from './EntityPanel';

interface SocialAnalysisModalProps {
  visible: boolean;
  onClose: () => void;
  analysis?: SavedItem['analysisInfo'] | SavedItem['xAnalysisInfo'];
  onRefresh?: () => void;
  platform?: 'instagram' | 'twitter' | 'x' | 'tiktok' | 'youtube';
  url?: string;
}

export default function SocialAnalysisModal({
  visible,
  onClose,
  analysis,
  onRefresh,
  platform = 'instagram',
  url,
}: SocialAnalysisModalProps) {
  const isLoading = analysis?.loading;
  const hasError = !!analysis?.error && !analysis?.loading;
  const hasData = !isLoading && !hasError && (analysis?.summary || analysis?.transcript || analysis?.images?.length);
  const parsedSummary = parseSummary(analysis?.summary);
  const [transcriptExpanded, setTranscriptExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (text?: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert('Copiado', 'El contenido se copió al portapapeles.');
  };

  const getPlatformInfo = () => {
    const normalizedPlatform = platform === 'x' ? 'twitter' : platform;
    switch (normalizedPlatform) {
      case 'instagram':
        return { name: 'Instagram', icon: 'logo-instagram', color: '#E4405F', emoji: '📷' };
      case 'twitter':
        return { name: 'X', icon: 'logo-twitter', color: '#1DA1F2', emoji: '𝕏' };
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
      // En web, abrir en nueva pestaña para no perder el estado
      const isWeb = typeof window !== 'undefined' && typeof window.document !== 'undefined';
      if (isWeb) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        Linking.openURL(url);
      }
    } else {
      Alert.alert('Error', 'URL no disponible');
    }
  };

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
    value: analysis?.type === 'video' ? 'Video' : analysis?.type === 'carousel' ? 'Carrusel' : analysis?.type === 'image' ? 'Imagen' : 'Texto',
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    iconColor: '#7C3AED'
  };

  const getReadingTime = (text?: string) => {
    if (!text) return '';
    const words = text.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `~${minutes} min`;
  };

  React.useEffect(() => {
    if (!visible) {
      setTranscriptExpanded(false);
    }
  }, [visible]);

  // Debug logging para ver si el modal se abre
  React.useEffect(() => {
    console.log('[SocialAnalysisModal] visible:', visible, 'isLoading:', isLoading, 'hasData:', hasData);
    console.log('[SocialAnalysisModal] entities:', analysis?.entities?.length || 0, analysis?.entities);
  }, [visible, isLoading, hasData, analysis?.entities]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
      {...(Platform.OS === 'ios' ? { presentationStyle: 'fullScreen' } : {})}
    >
      <LinearGradient
        colors={['#FFFFFF', '#F9FAFB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.fullScreenContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>Análisis del post</Text>
            <View style={styles.headerButtons}>
              {onRefresh && (
                <Pressable
                  onPress={() => onRefresh()}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.iconButton,
                    pressed && styles.iconButtonPressed,
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <Ionicons name="refresh" size={20} color="#2563EB" />
                  )}
                </Pressable>
              )}
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.iconButtonPressed,
                ]}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </Pressable>
            </View>
          </View>

          {/* Platform Badge and Timestamp */}
          <View style={styles.platformRow}>
            <View style={styles.platformBadge}>
              <Text style={styles.platformEmoji}>{platformInfo.emoji}</Text>
              <Text style={styles.platformName}>{platformInfo.name}</Text>
            </View>
            {analysis?.lastUpdated && (
              <Text style={styles.timestamp}>
                {new Date(analysis.lastUpdated).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </Text>
            )}
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionButtons}>
            <Pressable
              onPress={handleOpenOriginal}
              style={({ pressed }) => [
                styles.openButton,
                pressed && styles.openButtonPressed,
              ]}
            >
              <Text style={styles.openButtonText}>Abrir</Text>
              <Ionicons name="open-outline" size={16} color="white" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.moreButton,
                pressed && styles.moreButtonPressed,
              ]}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#6B7280" />
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Analizando contenido...</Text>
          </View>
        ) : hasError ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorCard}>
              <View style={styles.errorIconContainer}>
                <Ionicons name="warning-outline" size={30} color="#F59E0B" />
                <Text style={styles.errorTitle}>No se pudo analizar el post</Text>
              </View>
              <Text style={styles.errorText}>
                {analysis?.error || 'Intenta de nuevo más tarde.'}
              </Text>
              {onRefresh && (
                <Pressable onPress={() => onRefresh()} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : hasData ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Info Cards Section */}
            <View style={styles.infoCardsGrid}>
              <View style={styles.infoCard}>
                <LinearGradient
                  colors={[topicData.backgroundColor, `${topicData.backgroundColor}80`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.infoCardGradient, { borderColor: topicData.borderColor }]}
                >
                  <View style={styles.infoCardHeader}>
                    <Text style={styles.infoCardIcon}>{topicData.icon}</Text>
                    <Text style={[styles.infoCardLabel, { color: topicData.iconColor }]}>
                      {topicData.label}
                    </Text>
                  </View>
                  <Text style={styles.infoCardValue}>{topicData.value}</Text>
                </LinearGradient>
              </View>
              <View style={styles.infoCard}>
                <LinearGradient
                  colors={[sentimentData.backgroundColor, `${sentimentData.backgroundColor}80`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.infoCardGradient, { borderColor: sentimentData.borderColor }]}
                >
                  <View style={styles.infoCardHeader}>
                    <Text style={styles.infoCardIcon}>{sentimentData.icon}</Text>
                    <Text style={[styles.infoCardLabel, { color: sentimentData.iconColor }]}>
                      Sentimiento
                    </Text>
                  </View>
                  <Text style={styles.infoCardValue}>{sentimentData.value}</Text>
                </LinearGradient>
              </View>
            </View>

            {/* Summary Section */}
            {parsedSummary.bullets.length > 0 && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View style={styles.summaryTitleRow}>
                    <Text style={styles.summaryIcon}>💡</Text>
                    <Text style={styles.summaryTitle}>Resumen</Text>
                  </View>
                  <Pressable
                    onPress={() => handleCopy(analysis?.summary)}
                    style={({ pressed }) => [
                      styles.copyButton,
                      pressed && styles.copyButtonPressed,
                    ]}
                  >
                    <Ionicons name="copy-outline" size={16} color="#6B7280" />
                    <Text style={styles.copyButtonText}>
                      {copied ? 'Copiado' : 'Copiar'}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.summaryBadges}>
                  <View style={styles.summaryBadge}>
                    <Ionicons name="list" size={16} color="#7C3AED" />
                    <Text style={styles.summaryBadgeText}>
                      {parsedSummary.bullets.length} puntos
                    </Text>
                  </View>
                  <View style={styles.summaryBadge}>
                    <Ionicons name="time-outline" size={16} color="#7C3AED" />
                    <Text style={styles.summaryBadgeText}>~1 min</Text>
                  </View>
                </View>

                <View style={styles.bulletList}>
                  {parsedSummary.bullets.map((bullet, index) => (
                    <View key={`${bullet.emphasis || bullet.text}-${index}`} style={styles.bulletCard}>
                      <View style={styles.bulletContent}>
                        <View style={styles.bulletDot}>
                          <View style={styles.bulletDotInner} />
                        </View>
                        <Text style={styles.bulletText}>
                          {bullet.emphasis && (
                            <Text style={styles.bulletEmphasis}>{bullet.emphasis} </Text>
                          )}
                          {bullet.text}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {parsedSummary.tldr && (
                  <View style={styles.tldrSection}>
                    <View style={styles.tldrCard}>
                      <Text style={styles.tldrLabel}>TL;DR</Text>
                      <Text style={styles.tldrText}>{parsedSummary.tldr}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Transcript Section */}
            {analysis?.transcript && (
              <View style={styles.transcriptCard}>
                <Pressable
                  onPress={() => setTranscriptExpanded((prev) => !prev)}
                  style={styles.transcriptHeader}
                >
                  <View style={styles.transcriptTitleRow}>
                    <Ionicons name="document-text" size={20} color="#7C3AED" />
                    <Text style={styles.transcriptTitle}>Transcripción</Text>
                  </View>
                  <View style={styles.transcriptBadges}>
                    {getReadingTime(analysis.transcript) && (
                      <View style={styles.summaryBadge}>
                        <Ionicons name="time-outline" size={16} color="#7C3AED" />
                        <Text style={styles.summaryBadgeText}>
                          {getReadingTime(analysis.transcript)}
                        </Text>
                      </View>
                    )}
                    <Ionicons
                      name={transcriptExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#6B7280"
                    />
                  </View>
                </Pressable>

                {transcriptExpanded && (
                  <View style={styles.transcriptContent}>
                    <Text style={styles.transcriptText}>{analysis.transcript}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Extracted Entities Section */}
            {analysis?.entities && analysis.entities.length > 0 && (
              <EntityPanel entities={analysis.entities} platform={platform} />
            )}

            {/* Visual Description Section */}
            {analysis?.images && analysis.images.length > 0 && (
              <View style={styles.imagesCard}>
                <View style={styles.imagesHeader}>
                  <View style={styles.imagesIconContainer}>
                    <Text style={styles.imagesIcon}>🖼️</Text>
                  </View>
                  <Text style={styles.imagesTitle}>Descripción visual</Text>
                </View>
                {analysis.images.slice(0, 3).map((image, idx) => (
                  <View key={image.url} style={styles.imageItem}>
                    <View style={styles.imageItemContent}>
                      <LinearGradient
                        colors={['#DBEAFE', '#E9D5FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.imageNumberBadge}
                      >
                        <Text style={styles.imageNumber}>{idx + 1}</Text>
                      </LinearGradient>
                      <View style={styles.imageItemText}>
                        <Text style={styles.imageLabel}>Imagen {idx + 1}</Text>
                        <Text style={styles.imageDescription}>{image.description}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="document-text-outline" size={32} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>Sin datos de análisis</Text>
            <Text style={styles.emptyText}>
              Toca "Actualizar" para generar la transcripción o descripción de este post.
            </Text>
          </View>
        )}
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    transform: [{ scale: 0.95 }],
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  platformEmoji: {
    fontSize: 14,
  },
  platformName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  timestamp: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  openButtonPressed: {
    backgroundColor: '#1D4ED8',
    transform: [{ scale: 0.95 }],
  },
  openButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  moreButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  moreButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  errorCard: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  errorIconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 999,
    alignSelf: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  infoCardsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
  },
  infoCardGradient: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoCardIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  infoCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
  },
  summaryCard: {
    marginBottom: 20,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  copyButtonPressed: {
    backgroundColor: '#E5E7EB',
    transform: [{ scale: 0.95 }],
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  summaryBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3E8FF',
    borderRadius: 999,
  },
  summaryBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
    marginLeft: 6,
  },
  bulletList: {
    gap: 12,
  },
  bulletCard: {
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bulletContent: {
    flexDirection: 'row',
    gap: 12,
  },
  bulletDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bulletDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 22,
  },
  bulletEmphasis: {
    fontWeight: '600',
  },
  tldrSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tldrCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAF5FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  tldrLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tldrText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 24,
  },
  transcriptCard: {
    marginBottom: 20,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  transcriptTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transcriptTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  transcriptBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transcriptContent: {
    padding: 20,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  transcriptText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 22,
  },
  imagesCard: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  imagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  imagesIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  imagesIcon: {
    fontSize: 18,
  },
  imagesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  imageItem: {
    marginBottom: 12,
  },
  imageItemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imageNumberBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  imageNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  imageItemText: {
    flex: 1,
  },
  imageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  imageDescription: {
    fontSize: 14,
    color: '#1F2937',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

