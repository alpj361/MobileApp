import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InstagramComment } from '../api/link-processor';
import { textStyles } from '../utils/typography';

interface InstagramCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  url: string;
  commentCount?: number;
  onCommentsLoaded?: (comments: InstagramComment[]) => void;
}

export default function InstagramCommentsModal({
  visible,
  onClose,
  url,
  commentCount = 0,
  onCommentsLoaded,
}: InstagramCommentsModalProps) {
  const [comments, setComments] = useState<InstagramComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible && comments.length === 0) {
      loadComments();
    }
  }, [visible]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://server.standatpd.com/api/instagram/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to load comments');
      }

      const data = await response.json();
      setComments(data.comments || []);

      if (onCommentsLoaded) {
        onCommentsLoaded(data.comments || []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar los comentarios. Inténtalo de nuevo más tarde.'
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedComments = React.useMemo(() => {
    let filtered = comments.filter(comment =>
      comment.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (sortBy) {
      case 'newest':
        return filtered.sort((a, b) => b.timestamp - a.timestamp);
      case 'oldest':
        return filtered.sort((a, b) => a.timestamp - b.timestamp);
      case 'popular':
        return filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      default:
        return filtered;
    }
  }, [comments, searchQuery, sortBy]);

  const toggleExpanded = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'hace menos de 1h';
    if (diffInHours < 24) return `hace ${diffInHours}h`;
    if (diffInHours < 168) return `hace ${Math.floor(diffInHours / 24)}d`;
    return date.toLocaleDateString();
  };

  const renderComment = ({ item: comment }: { item: InstagramComment }) => {
    const isExpanded = expandedComments.has(comment.id);
    const hasReplies = comment.replies && comment.replies.length > 0;
    const textPreview = comment.text.length > 150 ? comment.text.substring(0, 150) + '...' : comment.text;

    return (
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        {/* Main Comment */}
        <View className="flex-row">
          <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center mr-3">
            <Text className="text-xs font-semibold text-gray-600">
              {comment.author.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Text className={`${textStyles.badge} font-semibold text-gray-900`}>
                @{comment.author}
              </Text>
              {comment.verified && (
                <Ionicons name="checkmark-circle" size={14} color="#3B82F6" style={{ marginLeft: 4 }} />
              )}
              <Text className={`${textStyles.helper} text-gray-400 ml-2`}>
                {formatTimestamp(comment.timestamp)}
              </Text>
            </View>

            <Pressable onPress={() => toggleExpanded(comment.id)}>
              <Text className={`${textStyles.bodyText} text-gray-800 mb-2`}>
                {isExpanded ? comment.text : textPreview}
                {comment.text.length > 150 && (
                  <Text className="text-blue-500"> {isExpanded ? ' Ver menos' : ' Ver más'}</Text>
                )}
              </Text>
            </Pressable>

            <View className="flex-row items-center">
              {comment.likes && comment.likes > 0 && (
                <View className="flex-row items-center mr-4">
                  <Ionicons name="heart-outline" size={14} color="#EF4444" />
                  <Text className={`${textStyles.helper} text-gray-500 ml-1`}>
                    {comment.likes}
                  </Text>
                </View>
              )}

              {hasReplies && (
                <Pressable
                  onPress={() => toggleExpanded(comment.id)}
                  className="flex-row items-center"
                >
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="#6B7280"
                  />
                  <Text className={`${textStyles.helper} text-gray-500 ml-1`}>
                    {comment.replies?.length} respuesta{comment.replies?.length !== 1 ? 's' : ''}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Replies */}
        {isExpanded && hasReplies && (
          <View className="ml-11 mt-3 space-y-3">
            {comment.replies?.map((reply) => (
              <View key={reply.id} className="flex-row">
                <View className="w-6 h-6 rounded-full bg-gray-100 items-center justify-center mr-2">
                  <Text className="text-xs text-gray-600">
                    {reply.author.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text className={`${textStyles.badge} font-medium text-gray-800`}>
                      @{reply.author}
                    </Text>
                    {reply.verified && (
                      <Ionicons name="checkmark-circle" size={12} color="#3B82F6" style={{ marginLeft: 4 }} />
                    )}
                    <Text className={`${textStyles.helper} text-gray-400 ml-2`}>
                      {formatTimestamp(reply.timestamp)}
                    </Text>
                  </View>
                  <Text className={`${textStyles.description} text-gray-700`}>
                    {reply.text}
                  </Text>
                  {reply.likes && reply.likes > 0 && (
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="heart-outline" size={12} color="#EF4444" />
                      <Text className={`${textStyles.helper} text-gray-500 ml-1`}>
                        {reply.likes}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-5 py-4 border-b border-gray-200 flex-row items-center justify-between">
          <View>
            <Text className={`${textStyles.sectionTitle} text-gray-900`}>
              Comentarios
            </Text>
            <Text className={`${textStyles.description} text-gray-500`}>
              {comments.length} comentario{comments.length !== 1 ? 's' : ''}
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
          >
            <Ionicons name="close" size={20} color="#6B7280" />
          </Pressable>
        </View>

        {/* Search and Sort */}
        <View className="bg-white px-5 py-3 border-b border-gray-100">
          <View className="flex-row items-center bg-gray-50 rounded-full px-4 py-2 mb-3">
            <Ionicons name="search" size={16} color="#9CA3AF" />
            <TextInput
              className={`flex-1 ml-2 ${textStyles.bodyText}`}
              placeholder="Buscar comentarios..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

          <View className="flex-row gap-2">
            {(['newest', 'oldest', 'popular'] as const).map((sort) => (
              <Pressable
                key={sort}
                onPress={() => setSortBy(sort)}
                className={`px-3 py-1 rounded-full ${
                  sortBy === sort ? 'bg-blue-100' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`${textStyles.badge} ${
                    sortBy === sort ? 'text-blue-700' : 'text-gray-600'
                  }`}
                >
                  {sort === 'newest' ? 'Más recientes' :
                   sort === 'oldest' ? 'Más antiguos' : 'Más populares'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Content */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className={`${textStyles.description} text-gray-500 mt-4`}>
              Cargando comentarios...
            </Text>
          </View>
        ) : filteredAndSortedComments.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-16 h-16 bg-gray-200 rounded-full items-center justify-center mb-4">
              <Ionicons name="chatbubble-outline" size={24} color="#9CA3AF" />
            </View>
            <Text className={`${textStyles.cardTitle} text-gray-900 mb-2`}>
              {searchQuery ? 'No se encontraron comentarios' : 'Sin comentarios'}
            </Text>
            <Text className={`${textStyles.description} text-gray-500 text-center`}>
              {searchQuery
                ? 'Intenta con otros términos de búsqueda'
                : 'Este post no tiene comentarios disponibles'
              }
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredAndSortedComments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </Modal>
  );
}