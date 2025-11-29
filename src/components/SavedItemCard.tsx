/**
 * Simple Saved Item Card
 * Simplified component without complex job management
 * Shows posts with immediate status and optional analysis results
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SavedItem, useSavedStore } from '../state/savedStore';
import { formatTimeAgo } from '../utils/time';
import SocialAnalysisModal from './SocialAnalysisModal';

interface SavedItemCardProps {
  item: SavedItem;
  onPress?: (item: SavedItem) => void;
}

export const SavedItemCard: React.FC<SavedItemCardProps> = ({
  item,
  onPress
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const removeSavedItem = useSavedStore(state => state.removeSavedItem);
  const toggleFavorite = useSavedStore(state => state.toggleFavorite);
  const startAnalysis = useSavedStore(state => state.startAnalysis);

  const handlePress = () => {
    if (item.status === 'completed' && item.analysisResult) {
      setModalVisible(true);
    } else if (onPress) {
      onPress(item);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this saved post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeSavedItem(item.id)
        }
      ]
    );
  };

  const handleFavorite = () => {
    toggleFavorite(item.id);
  };

  const handleAnalysis = () => {
    if (item.status === 'processing') {
      Alert.alert('Analysis in Progress', 'This post is currently being analyzed. Please wait...');
      return;
    }

    if (item.status === 'completed' && item.analysisResult) {
      Alert.alert('Analysis Complete', 'This post has already been analyzed. Check the results below.');
      return;
    }

    Alert.alert(
      'Start Analysis',
      'Would you like to analyze this post? This will extract content, entities, and insights.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Analyze',
          onPress: () => startAnalysis(item.id)
        }
      ]
    );
  };

  const handleOpenUrl = () => {
    if (item.url) {
      Linking.openURL(item.url).catch(error => {
        console.error('Failed to open URL:', error);
        Alert.alert('Error', 'Failed to open the link');
      });
    }
  };

  const getStatusIcon = () => {
    switch (item.status) {
      case 'processing':
        return <ActivityIndicator size="small" color="#007AFF" />;
      case 'completed':
        return <Ionicons name="checkmark-circle" size={16} color="#34C759" />;
      case 'failed':
        return <Ionicons name="close-circle" size={16} color="#FF3B30" />;
      default:
        return <Ionicons name="document" size={16} color="#8E8E93" />;
    }
  };

  const getStatusText = () => {
    if (item.isPending) return 'Saving...';

    switch (item.status) {
      case 'processing':
        return 'Analyzing...';
      case 'completed':
        return 'Analysis Complete';
      case 'failed':
        return item.analysisError || 'Analysis Failed';
      default:
        return 'Saved';
    }
  };

  const formatDescription = (text: string, maxLength: number = 150) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Handle both structures: direct object (new) or wrapped in data (legacy/potential wrapper)
  const rawData = item.analysisResult?.data || item.analysisResult;

  // Debug logging for data availability
  if (item.status === 'completed') {
    if (!rawData) {
      console.warn(`[SavedItemCard] ⚠️ Item ${item.id} (${item.url}) is completed but rawData is missing/falsy. AnalysisResult:`, JSON.stringify(item.analysisResult));
    } else {
      // Check for specific fields
      const hasAi = !!rawData.ai_generated;
      const hasTrans = !!rawData.transcription?.length;
      console.log(`[SavedItemCard] ✅ Item ${item.id} has data. AI: ${hasAi}, Trans: ${hasTrans}, Keys: ${Object.keys(rawData).join(', ')}`);
    }
  }

  const analysisInfo = rawData ? {
    loading: false,
    summary: rawData.ai_generated?.description || '',
    summary_bullets: rawData.ai_generated?.summary_bullets || [],
    transcript: '', // Will use transcription array instead
    transcription: rawData.transcription || [],
    media_analysis: rawData.media_analysis || [],
    topic: rawData.ai_generated?.category || '',
    sentiment: rawData.ai_generated?.sentiment || 'neutral',
    type: item.type || 'text',
    entities: rawData.entities || [],
    images: [],
    lastUpdated: item.lastUpdated || Date.now()
  } : undefined;

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      margin: 8,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderLeftWidth: 4,
      borderLeftColor: item.isFavorite ? '#FF9500' : '#E5E5EA',
    }}>
      {/* Header */}
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#1C1C1E',
              lineHeight: 22
            }} numberOfLines={2}>
              {item.title || 'Untitled Post'}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              {getStatusIcon()}
              <Text style={{
                fontSize: 12,
                color: '#8E8E93',
                marginLeft: 6
              }}>
                {getStatusText()}
              </Text>
              {item.lastUpdated && (
                <Text style={{ fontSize: 12, color: '#C7C7CC', marginLeft: 8 }}>
                  • {formatTimeAgo(item.lastUpdated)}
                </Text>
              )}
            </View>
          </View>

          {/* Platform indicator */}
          <View style={{
            backgroundColor: (item.platform as any) === 'x' ? '#000' : item.platform === 'instagram' ? '#E4405F' : '#007AFF',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>
              {item.platform?.toUpperCase() || 'WEB'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Content Preview */}
      {item.description && (
        <Text style={{
          fontSize: 14,
          color: '#3C3C43',
          lineHeight: 20,
          marginBottom: 12
        }}>
          {isExpanded ? item.description : formatDescription(item.description)}
        </Text>
      )}

      {/* Error Message */}
      {item.outerErrorMessage && (
        <View style={{
          backgroundColor: '#FFEBEE',
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
          borderLeftWidth: 3,
          borderLeftColor: '#FF3B30'
        }}>
          <Text style={{ color: '#D32F2F', fontSize: 12, fontWeight: '500' }}>
            Error: {item.outerErrorMessage}
          </Text>
        </View>
      )}

      {/* Analysis Results */}
      {item.status === 'completed' && rawData && isExpanded && (
        <View style={{
          backgroundColor: '#F2F2F7',
          padding: 12,
          borderRadius: 8,
          marginBottom: 12
        }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 }}>
            🤖 AI Analysis Results
          </Text>

          {/* AI Generated Content */}
          {rawData.ai_generated && (
            <View>
              {/* Title */}
              {rawData.ai_generated.title && (
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#007AFF', marginBottom: 2 }}>
                    📝 Generated Title:
                  </Text>
                  <Text style={{ fontSize: 12, color: '#1C1C1E', fontWeight: '500' }}>
                    {rawData.ai_generated.title}
                  </Text>
                </View>
              )}

              {/* Description */}
              {rawData.ai_generated.description && (
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#007AFF', marginBottom: 2 }}>
                    📋 Summary:
                  </Text>
                  <Text style={{ fontSize: 12, color: '#3C3C43', lineHeight: 16 }}>
                    {rawData.ai_generated.description}
                  </Text>
                </View>
              )}

              {/* Key Points */}
              {rawData.ai_generated.summary_bullets && (
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#007AFF', marginBottom: 2 }}>
                    🔍 Key Points:
                  </Text>
                  {rawData.ai_generated.summary_bullets.map((point: string, index: number) => (
                    <Text key={index} style={{ fontSize: 11, color: '#3C3C43', lineHeight: 14, marginBottom: 1 }}>
                      • {point}
                    </Text>
                  ))}
                </View>
              )}

              {/* Engagement Metrics */}
              {rawData.engagement && (
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#007AFF', marginBottom: 2 }}>
                    📊 Engagement:
                  </Text>
                  <Text style={{ fontSize: 11, color: '#3C3C43' }}>
                    👍 {rawData.engagement.likes} •
                    🔄 {rawData.engagement.shares} •
                    💬 {rawData.engagement.comments}
                    {rawData.engagement.engagement_rate &&
                      ` • ${rawData.engagement.engagement_rate}% rate`
                    }
                  </Text>
                </View>
              )}

              {/* Category & Sentiment */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                {rawData.ai_generated.category && (
                  <Text style={{ fontSize: 10, color: '#8E8E93', backgroundColor: '#E8E8ED', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    📂 {rawData.ai_generated.category}
                  </Text>
                )}
                {rawData.ai_generated.sentiment && (
                  <Text style={{
                    fontSize: 10,
                    color: rawData.ai_generated.sentiment === 'positive' ? '#34C759' :
                      rawData.ai_generated.sentiment === 'negative' ? '#FF3B30' : '#8E8E93',
                    backgroundColor: '#F2F2F7',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4
                  }}>
                    {rawData.ai_generated.sentiment === 'positive' ? '😊' :
                      rawData.ai_generated.sentiment === 'negative' ? '😔' : '😐'}
                    {rawData.ai_generated.sentiment}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Video/Audio Transcriptions */}
          {rawData.transcription && Array.isArray(rawData.transcription) && rawData.transcription.length > 0 && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E5EA' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#007AFF', marginBottom: 6 }}>
                🎬 Video/Audio Transcriptions ({rawData.transcription.length})
              </Text>
              {rawData.transcription.slice(0, 2).map((trans: any, idx: number) => (
                <View key={idx} style={{ marginBottom: 8, backgroundColor: '#F8F9FA', padding: 8, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#6B7280', marginBottom: 4 }}>
                    {trans.type === 'video' ? '🎥' : '🎵'} {trans.type?.toUpperCase()} {idx + 1}
                    {trans.metadata?.words_count && ` • ${trans.metadata.words_count} palabras`}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#3C3C43', lineHeight: 14 }} numberOfLines={3}>
                    {trans.transcription}
                  </Text>
                </View>
              ))}
              {rawData.transcription.length > 2 && (
                <Text style={{ fontSize: 10, color: '#8E8E93', fontStyle: 'italic' }}>
                  +{rawData.transcription.length - 2} more
                </Text>
              )}
            </View>
          )}

          {/* Image Analysis */}
          {rawData.media_analysis && Array.isArray(rawData.media_analysis) && rawData.media_analysis.length > 0 && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E5EA' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#007AFF', marginBottom: 6 }}>
                🖼️ Image Analysis ({rawData.media_analysis.length})
              </Text>
              {rawData.media_analysis.slice(0, 2).map((media: any, idx: number) => (
                <View key={idx} style={{ marginBottom: 8, backgroundColor: '#F8F9FA', padding: 8, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#6B7280', marginBottom: 4 }}>
                    📸 IMAGE {idx + 1}
                    {media.metadata?.words_count && ` • ${media.metadata.words_count} palabras`}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#3C3C43', lineHeight: 14 }} numberOfLines={3}>
                    {media.description}
                  </Text>
                </View>
              ))}
              {rawData.media_analysis.length > 2 && (
                <Text style={{ fontSize: 10, color: '#8E8E93', fontStyle: 'italic' }}>
                  +{rawData.media_analysis.length - 2} more
                </Text>
              )}
            </View>
          )}

          {/* Fallback for simple analysis */}
          {(!rawData.ai_generated && item.analysisResult) && (
            <Text style={{ fontSize: 12, color: '#3C3C43', lineHeight: 16 }}>
              {typeof item.analysisResult === 'string'
                ? item.analysisResult
                : item.analysisResult.summary || 'Analysis completed successfully'
              }
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Favorite Button */}
          <TouchableOpacity
            onPress={handleFavorite}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: item.isFavorite ? '#FFF3E0' : '#F2F2F7',
              marginRight: 8
            }}
          >
            <Ionicons
              name={item.isFavorite ? 'heart' : 'heart-outline'}
              size={16}
              color={item.isFavorite ? '#FF9500' : '#8E8E93'}
            />
            <Text style={{
              fontSize: 12,
              color: item.isFavorite ? '#FF9500' : '#8E8E93',
              marginLeft: 4,
              fontWeight: '500'
            }}>
              {item.isFavorite ? 'Favorited' : 'Favorite'}
            </Text>
          </TouchableOpacity>

          {/* Analysis Button */}
          <TouchableOpacity
            onPress={handleAnalysis}
            disabled={item.status === 'processing'}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: item.status === 'completed' ? '#E8F5E8' : '#F2F2F7',
              marginRight: 8,
              opacity: item.status === 'processing' ? 0.6 : 1
            }}
          >
            <Ionicons
              name={
                item.status === 'completed' ? 'checkmark-circle' :
                  item.status === 'processing' ? 'hourglass' :
                    'analytics'
              }
              size={16}
              color={
                item.status === 'completed' ? '#34C759' :
                  item.status === 'processing' ? '#FF9500' :
                    '#007AFF'
              }
            />
            <Text style={{
              fontSize: 12,
              color: item.status === 'completed' ? '#34C759' : '#007AFF',
              marginLeft: 4,
              fontWeight: '500'
            }}>
              {item.status === 'completed' ? 'Analyzed' :
                item.status === 'processing' ? 'Analyzing' : 'Analyze'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Menu */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Open URL */}
          <TouchableOpacity
            onPress={handleOpenUrl}
            style={{ padding: 8, marginRight: 4 }}
          >
            <Ionicons name="open-outline" size={18} color="#007AFF" />
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            onPress={handleDelete}
            style={{ padding: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Source and Type Info */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7'
      }}>
        <Text style={{ fontSize: 11, color: '#8E8E93' }}>
          Source: {item.source} • Type: {item.type}
          {item.quality && ` • Quality: ${item.quality}`}
        </Text>
        <TouchableOpacity onPress={handlePress}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#8E8E93"
          />
        </TouchableOpacity>
      </View>

      {/* Analysis Modal */}
      <SocialAnalysisModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        analysis={analysisInfo as any}
        platform={item.platform as any}
        url={item.url}
      />
    </View>
  );
};