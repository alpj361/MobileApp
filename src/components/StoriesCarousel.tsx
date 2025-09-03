import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  StatusBar,
  Animated,
  PanGestureHandler,
  State,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Story } from '../config/supabase';
import { StoriesService } from '../services/storiesService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_WIDTH = 120;
const STORY_HEIGHT = 180;

interface StoriesCarouselProps {
  onStoryPress?: (story: Story) => void;
}

export const StoriesCarousel: React.FC<StoriesCarouselProps> = ({ onStoryPress }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressAnimated = useRef(new Animated.Value(0)).current;
  const storyTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      setLoading(true);
      const data = await StoriesService.getActiveStories();
      setStories(data);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const openStory = (story: Story, index: number) => {
    setSelectedStory(story);
    setCurrentStoryIndex(index);
    setProgress(0);
    onStoryPress?.(story);
    StoriesService.incrementViewCount(story.id);
    startStoryTimer();
  };

  const closeStory = () => {
    setSelectedStory(null);
    stopStoryTimer();
  };

  const startStoryTimer = () => {
    stopStoryTimer();
    progressAnimated.setValue(0);
    
    Animated.timing(progressAnimated, {
      toValue: 1,
      duration: 5000, // 5 segundos por story
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        nextStory();
      }
    });
  };

  const stopStoryTimer = () => {
    if (storyTimer.current) {
      clearTimeout(storyTimer.current);
    }
    progressAnimated.stopAnimation();
  };

  const nextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      const nextIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(nextIndex);
      setSelectedStory(stories[nextIndex]);
      setProgress(0);
      StoriesService.incrementViewCount(stories[nextIndex].id);
      startStoryTimer();
    } else {
      closeStory();
    }
  };

  const previousStory = () => {
    if (currentStoryIndex > 0) {
      const prevIndex = currentStoryIndex - 1;
      setCurrentStoryIndex(prevIndex);
      setSelectedStory(stories[prevIndex]);
      setProgress(0);
      StoriesService.incrementViewCount(stories[prevIndex].id);
      startStoryTimer();
    }
  };

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: progressAnimated } }],
    { useNativeDriver: false }
  );

  const handleStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.END) {
      if (nativeEvent.translationY > 100) {
        closeStory();
      }
    }
  };

  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      trending: '#ef4444',
      news: '#3b82f6',
      insights: '#8b5cf6',
      hot: '#f43f5e',
      global: '#10b981',
    };
    return colors[category] || '#6b7280';
  };

  const getCategoryEmoji = (category: string): string => {
    const emojis: { [key: string]: string } = {
      trending: '🔥',
      news: '📰',
      insights: '💡',
      hot: '🚀',
      global: '🌍',
    };
    return emojis[category] || '📱';
  };

  const StoryPreview: React.FC<{ story: Story; index: number }> = ({ story, index }) => (
    <TouchableOpacity
      onPress={() => openStory(story, index)}
      className="mr-3"
      style={{ width: STORY_WIDTH, height: STORY_HEIGHT }}
    >
      <LinearGradient
        colors={story.gradient_colors || [story.background_color, story.background_color]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-1 rounded-2xl p-3 justify-between shadow-lg"
      >
        {/* Category Badge */}
        <View className="flex-row items-center justify-between">
          <View
            className="px-2 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <Text className="text-white text-xs font-medium">
              {getCategoryEmoji(story.category)}
            </Text>
          </View>
          <View className="w-2 h-2 rounded-full bg-white opacity-60" />
        </View>

        {/* Content */}
        <View>
          <Text
            className="text-white font-bold text-sm leading-tight"
            numberOfLines={3}
            style={{ color: story.text_color }}
          >
            {story.title}
          </Text>
          <Text
            className="text-white text-xs mt-1 opacity-90"
            numberOfLines={2}
            style={{ color: story.text_color }}
          >
            {story.summary.substring(0, 50)}...
          </Text>
        </View>

        {/* Engagement */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="text-white text-xs opacity-70">
              👁 {story.view_count}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-white text-xs opacity-70">
              🔗 {story.share_count}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const FullStoryModal: React.FC = () => {
    if (!selectedStory) return null;

    return (
      <Modal
        visible={!!selectedStory}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeStory}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        <PanGestureHandler
          onGestureEvent={handleGestureEvent}
          onHandlerStateChange={handleStateChange}
        >
          <Animated.View className="flex-1">
            <LinearGradient
              colors={selectedStory.gradient_colors || [selectedStory.background_color, selectedStory.background_color]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="flex-1"
            >
              {/* Progress Bars */}
              <View className="absolute top-12 left-4 right-4 z-10">
                <View className="flex-row space-x-1">
                  {stories.map((_, index) => (
                    <View key={index} className="flex-1 h-1 bg-white bg-opacity-30 rounded-full">
                      {index === currentStoryIndex && (
                        <Animated.View
                          className="h-full bg-white rounded-full"
                          style={{
                            width: progressAnimated.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%'],
                            }),
                          }}
                        />
                      )}
                      {index < currentStoryIndex && (
                        <View className="h-full bg-white rounded-full" />
                      )}
                    </View>
                  ))}
                </View>
              </View>

              {/* Touch Areas */}
              <View className="flex-1 flex-row">
                <TouchableOpacity 
                  className="flex-1" 
                  onPress={previousStory}
                  activeOpacity={1}
                />
                <TouchableOpacity 
                  className="flex-1" 
                  onPress={nextStory}
                  activeOpacity={1}
                />
              </View>

              {/* Story Content */}
              <View className="absolute inset-0 justify-center px-8">
                <View className="items-center">
                  {/* Category & Emojis */}
                  <View className="flex-row items-center mb-6">
                    {selectedStory.metadata.emojis?.map((emoji, index) => (
                      <Text key={index} className="text-4xl mr-2">
                        {emoji}
                      </Text>
                    ))}
                  </View>

                  {/* Title */}
                  <Text
                    className="text-4xl font-bold text-center mb-6 leading-tight"
                    style={{ 
                      color: selectedStory.text_color,
                      fontSize: selectedStory.metadata.font_size === 'large' ? 48 : 
                               selectedStory.metadata.font_size === 'small' ? 28 : 36
                    }}
                  >
                    {selectedStory.title}
                  </Text>

                  {/* Summary */}
                  <Text
                    className="text-lg text-center leading-relaxed px-4"
                    style={{ 
                      color: selectedStory.text_color,
                      opacity: 0.95
                    }}
                  >
                    {selectedStory.summary}
                  </Text>

                  {/* Source Info */}
                  <View className="mt-8 px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <Text className="text-white text-sm opacity-80">
                      {selectedStory.source_type === 'hybrid' ? '🔮 Análisis Híbrido' :
                       selectedStory.source_type === 'trend' ? '📈 Tendencias' : '📰 Noticias'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={closeStory}
                className="absolute top-12 right-4 w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Text className="text-white text-lg font-bold">✕</Text>
              </TouchableOpacity>

              {/* Share Button */}
              <TouchableOpacity
                onPress={() => StoriesService.incrementShareCount(selectedStory.id)}
                className="absolute bottom-20 right-8 w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Text className="text-white text-xl">📤</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </PanGestureHandler>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View className="h-48 justify-center items-center">
        <View className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <Text className="text-gray-600 mt-2">Cargando stories...</Text>
      </View>
    );
  }

  if (stories.length === 0) {
    return (
      <View className="h-48 justify-center items-center px-4">
        <Text className="text-gray-500 text-center">
          📱 No hay stories disponibles en este momento
        </Text>
        <TouchableOpacity 
          onPress={loadStories}
          className="mt-2 px-4 py-2 bg-blue-500 rounded-full"
        >
          <Text className="text-white text-sm">Actualizar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="py-4">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 mb-4">
        <Text className="text-xl font-bold text-gray-800">📱 Stories</Text>
        <TouchableOpacity 
          onPress={loadStories}
          className="px-3 py-1 bg-gray-100 rounded-full"
        >
          <Text className="text-gray-600 text-sm">🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Stories Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        className="flex-grow-0"
      >
        {stories.map((story, index) => (
          <StoryPreview key={story.id} story={story} index={index} />
        ))}
      </ScrollView>

      {/* Full Story Modal */}
      <FullStoryModal />
    </View>
  );
};

export default StoriesCarousel;
