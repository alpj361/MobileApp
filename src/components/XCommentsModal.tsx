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
import { XComment } from '../services/xCommentService';
import { textStyles } from '../utils/typography';
import { loadXComments } from '../storage/xCommentsRepo';
import { extractXPostId } from '../utils/x';

interface XCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  url: string;
  postId?: string | null;
  commentCount?: number;
  isLoading?: boolean;
  initialComments?: XComment[];
  onRetry?: () => void;
  onCommentsLoaded?: (comments: XComment[]) => void;
}

export default function XCommentsModal({
  visible,
  onClose,
  url,
  postId: postIdProp,
  commentCount = 0,
  isLoading = false,
  initialComments = [],
  onRetry,
  onCommentsLoaded,
}: XCommentsModalProps) {
  const [comments, setComments] = useState<XComment[]>(initialComments);
  const [loading, setLoading] = useState<boolean>(isLoading);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState<number>(commentCount);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  useEffect(() => {
    if (!visible) return;
    // initialize with provided initial comments if any
    if (initialComments.length > 0) {
      setComments(initialComments);
    }
    const postId = postIdProp ?? extractXPostId(url);
    
    // Debug logging
    console.log('[XCommentsModal] Opening modal for:');
    console.log('  URL:', url);
    console.log('  Extracted PostID:', postId);
    console.log('  PostID from prop:', postIdProp);
    
    if (!postId) {
      console.warn('[XCommentsModal] No postId found for URL:', url);
      return;
    }
    (async () => {
      try {
        const cached = await loadXComments(postId);
        if (cached) {
          console.log('[XCommentsModal] Loaded from cache:', {
            postId: cached.postId,
            commentsCount: cached.comments.length,
            url: cached.url
          });
          setComments((prev) => (prev.length >= cached.comments.length ? prev : cached.comments));
          setTotalCount(cached.totalCount ?? cached.extractedCount ?? totalCount);
          if (onCommentsLoaded) onCommentsLoaded(cached.comments);
        } else {
          console.log('[XCommentsModal] No cache found for postId:', postId);
        }
      } catch (e) {
        console.error('[XCommentsModal] Error loading cache:', e);
      }
    })();
  }, [visible, url, postIdProp]);

  // Poll local cache while loading to reflect background progress
  useEffect(() => {
    if (!visible) return undefined;
    const postId = postIdProp ?? extractXPostId(url);
    if (!postId) return undefined;

    let cancelled = false;
    let ticks = 0;
    const maxTicks = 15; // ~30s at 2s interval

    const interval = setInterval(async () => {
      if (!loading) return; // stop polling when loading prop goes false
      ticks += 1;
      try {
        const cached = await loadXComments(postId);
        if (cached && !cancelled) {
          setComments((prev) => (cached.comments.length > prev.length ? cached.comments : prev));
          setTotalCount((prev) => cached.totalCount ?? cached.extractedCount ?? prev);
          if (onCommentsLoaded && cached.comments.length > 0) onCommentsLoaded(cached.comments);
        }
      } catch {
        // ignore during polling
      }
      if (ticks >= maxTicks) {
        clearInterval(interval);
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [visible, loading, url, postIdProp]);

  const handleRetry = async () => {
    console.log('[XCommentsModal] Retry triggered for URL:', url);
    if (onRetry) onRetry();
    setLoading(true);
    const postId = postIdProp ?? extractXPostId(url);
    console.log('[XCommentsModal] Retrying with postId:', postId);
    if (!postId) return;
    setTimeout(async () => {
      try {
        const cached = await loadXComments(postId);
        if (cached) {
          console.log('[XCommentsModal] Retry loaded:', cached.comments.length, 'comments');
          setComments(cached.comments);
          setTotalCount(cached.totalCount ?? cached.extractedCount ?? totalCount);
          if (onCommentsLoaded) onCommentsLoaded(cached.comments);
        } else {
          console.warn('[XCommentsModal] No cache after retry');
          Alert.alert('Sin datos', 'Aún no hay comentarios nuevos en la caché.');
        }
      } catch (e) {
        console.error('[XCommentsModal] Retry error:', e);
        Alert.alert('Error', 'No se pudieron cargar los comentarios locales.');
      } finally {
        setLoading(false);
      }
    }, 1500);
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

  const renderComment = ({ item: comment }: { item: XComment }) => {
    const isExpanded = expandedComments.has(comment.id);
    const hasReplies = comment.replies && comment.replies.length > 0;
    const textPreview = comment.text.length > 150 ? comment.text.substring(0, 150) + '...' : comment.text;

    return (
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        {/* Main Comment */}
        <View className="flex-row">
          <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
            <Text className="text-xs font-semibold text-blue-700">
              {comment.author.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Text className={`${textStyles.badge} font-semibold text-gray-900`}>
                @{comment.author}
              </Text>
              {comment.verified && (
                <Ionicons name="checkmark-circle" size={14} color="#1DA1F2" style={{ marginLeft: 4 }} />
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
                <View className="w-6 h-6 rounded-full bg-blue-50 items-center justify-center mr-2">
                  <Text className="text-xs text-blue-700">
                    {reply.author.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text className={`${textStyles.badge} font-medium text-gray-800`}>
                      @{reply.author}
                    </Text>
                    {reply.verified && (
                      <Ionicons name="checkmark-circle" size={12} color="#1DA1F2" style={{ marginLeft: 4 }} />
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
            <View className="flex-row items-center mb-1">
              <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
              <Text className={`${textStyles.sectionTitle} text-gray-900 ml-2`}>
                Comentarios de X
              </Text>
            </View>
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

        {/* Search, Sort and Actions */}
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

          <View className="flex-row gap-2 items-center justify-between">
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
            {onRetry && (
              <Pressable
                onPress={handleRetry}
                className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200"
                disabled={loading}
              >
                <Text className={`${textStyles.badge} text-blue-700`}>
                  {loading ? 'Cargando…' : 'Reintentar'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Content */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#1DA1F2" />
            <Text className={`${textStyles.description} text-gray-500 mt-4`}>
              Cargando comentarios de X...
            </Text>
          </View>
        ) : filteredAndSortedComments.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="chatbubble-outline" size={24} color="#1DA1F2" />
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

