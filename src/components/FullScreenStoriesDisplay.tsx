import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Dimensions,
  Pressable,
  StatusBar,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Story } from '../config/supabase';
import { StoriesService } from '../services/storiesService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 6000; // 6 seconds per story

interface FullScreenStoriesDisplayProps {
  onStoryChange?: (story: Story, index: number) => void;
}

export const FullScreenStoriesDisplay: React.FC<FullScreenStoriesDisplayProps> = ({ 
  onStoryChange 
}) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  
  const progressAnimated = useRef(new Animated.Value(0)).current;
  const fadeAnimated = useRef(new Animated.Value(1)).current;
  const storyTimer = useRef<NodeJS.Timeout | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadStories();
  }, []);

  useEffect(() => {
    if (stories.length > 0 && !isPaused) {
      startStoryTimer();
    }
    return () => stopStoryTimer();
  }, [currentIndex, stories, isPaused]);

  const loadStories = async () => {
    try {
      setLoading(true);
      const data = await StoriesService.getActiveStories();
      setStories(data);
      if (data.length > 0) {
        onStoryChange?.(data[0], 0);
        StoriesService.incrementViewCount(data[0].id);
      }
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const startStoryTimer = () => {
    stopStoryTimer();
    progressAnimated.setValue(0);
    
    Animated.timing(progressAnimated, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !isPaused) {
        nextStory();
      }
    });
  };

  const stopStoryTimer = () => {
    if (storyTimer.current) {
      clearTimeout(storyTimer.current);
      storyTimer.current = null;
    }
    progressAnimated.stopAnimation();
  };

  const nextStory = () => {
    if (currentIndex < stories.length - 1) {
      // Fade out current story
      Animated.timing(fadeAnimated, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        onStoryChange?.(stories[nextIndex], nextIndex);
        StoriesService.incrementViewCount(stories[nextIndex].id);
        
        // Fade in new story
        Animated.timing(fadeAnimated, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Loop back to first story
      setCurrentIndex(0);
      if (stories.length > 0) {
        onStoryChange?.(stories[0], 0);
        StoriesService.incrementViewCount(stories[0].id);
      }
    }
  };

  const previousStory = () => {
    if (currentIndex > 0) {
      Animated.timing(fadeAnimated, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        const prevIndex = currentIndex - 1;
        setCurrentIndex(prevIndex);
        onStoryChange?.(stories[prevIndex], prevIndex);
        StoriesService.incrementViewCount(stories[prevIndex].id);
        
        Animated.timing(fadeAnimated, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const handlePress = () => {
    setIsPaused(!isPaused);
    setTimeout(() => setIsPaused(false), 3000); // Auto-resume after 3 seconds
  };

  const formatDate = (dateString?: string): string => {
    const date = dateString ? new Date(dateString) : new Date();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    const dayName = days[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName} ${day} de ${month} de ${year}`;
  };

  const getLocationContext = (story: Story): string => {
    // Extract location from story metadata or default to Guatemala
    if (story.metadata?.location) {
      return story.metadata.location;
    }
    
    // Check if story has local context
    if (story.source_type === 'trend' || story.category === 'local') {
      return 'Guatemala';
    }
    
    return 'Guatemala'; // Default assumption
  };

  const getStorySubtitle = (story: Story): string => {
    const baseText = "Te compartimos un resumen informativo sobre las noticias del día.";
    
    switch (story.source_type) {
      case 'trend':
        return "Te compartimos las tendencias más importantes del momento.";
      case 'news':
        return "Te compartimos un resumen informativo sobre las noticias del día.";
      case 'hybrid':
        return "Te compartimos un análisis completo de los eventos más relevantes.";
      default:
        return baseText;
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <View className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <Text className="text-gray-600 mt-4 text-lg">Cargando stories...</Text>
      </View>
    );
  }

  if (stories.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 px-8">
        <Text className="text-6xl mb-6">📱</Text>
        <Text className="text-2xl font-bold text-gray-800 text-center mb-4">
          No hay stories disponibles
        </Text>
        <Text className="text-gray-600 text-center text-lg leading-relaxed">
          Las stories aparecerán aquí cuando haya contenido nuevo disponible.
        </Text>
        <Pressable 
          onPress={loadStories}
          className="mt-8 px-8 py-4 bg-blue-500 rounded-full"
        >
          <Text className="text-white text-lg font-medium">Actualizar</Text>
        </Pressable>
      </View>
    );
  }

  const currentStory = stories[currentIndex];
  const location = getLocationContext(currentStory);

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <Pressable onPress={handlePress} className="flex-1">
        <LinearGradient
          colors={currentStory.gradient_colors && currentStory.gradient_colors.length >= 2 
            ? currentStory.gradient_colors as [string, string, ...string[]]
            : [currentStory.background_color, currentStory.background_color] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="flex-1"
        >
          {/* Progress Bars */}
          <View 
            className="absolute left-4 right-4 z-10 flex-row space-x-1"
            style={{ top: insets.top + 16 }}
          >
            {stories.map((_, index) => (
              <View key={index} className="flex-1 h-1 bg-white bg-opacity-30 rounded-full">
                {index === currentIndex && (
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
                {index < currentIndex && (
                  <View className="h-full bg-white rounded-full" />
                )}
              </View>
            ))}
          </View>

          {/* Touch Areas for Navigation */}
          <View className="absolute inset-0 flex-row">
            <Pressable 
              className="flex-1" 
              onPress={previousStory}
              style={{ opacity: 0 }}
            />
            <Pressable 
              className="flex-1" 
              onPress={nextStory}
              style={{ opacity: 0 }}
            />
          </View>

          {/* Story Content */}
          <Animated.View 
            className="flex-1 justify-center px-8"
            style={{ opacity: fadeAnimated }}
          >
            <View className="items-center">
              {/* Date */}
              <Text
                className="text-lg font-medium mb-8 opacity-80"
                style={{ color: currentStory.text_color }}
              >
                {formatDate(currentStory.created_at)}
              </Text>

              {/* Main Title */}
              <Text
                className="text-6xl font-bold text-center mb-6 leading-tight"
                style={{ 
                  color: currentStory.text_color,
                  fontSize: currentStory.metadata?.font_size === 'large' ? 72 : 
                           currentStory.metadata?.font_size === 'small' ? 48 : 60
                }}
              >
                Hoy en
              </Text>

              <Text
                className="text-6xl font-bold text-center mb-12 leading-tight"
                style={{ 
                  color: currentStory.text_color,
                  fontSize: currentStory.metadata?.font_size === 'large' ? 72 : 
                           currentStory.metadata?.font_size === 'small' ? 48 : 60
                }}
              >
                {location}
              </Text>

              {/* Subtitle */}
              <Text
                className="text-xl text-center leading-relaxed px-4 mb-8 opacity-90"
                style={{ color: currentStory.text_color }}
              >
                {getStorySubtitle(currentStory)}
              </Text>

              {/* Story Title */}
              <Text
                className="text-2xl font-semibold text-center leading-relaxed px-4 mb-6"
                style={{ 
                  color: currentStory.text_color,
                  opacity: 0.95
                }}
              >
                {currentStory.title}
              </Text>

              {/* Story Summary */}
              <Text
                className="text-lg text-center leading-relaxed px-6 opacity-85"
                style={{ color: currentStory.text_color }}
              >
                {currentStory.summary}
              </Text>

              {/* Source Badge */}
              <View className="mt-12 px-6 py-3 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <Text className="text-white text-sm font-medium opacity-90">
                  {currentStory.source_type === 'hybrid' ? '🔮 Análisis Híbrido' :
                   currentStory.source_type === 'trend' ? '📈 Tendencias' : '📰 Noticias'}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Pause Indicator */}
          {isPaused && (
            <View className="absolute inset-0 justify-center items-center">
              <View className="px-6 py-3 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <Text className="text-white text-lg font-medium">⏸ Pausado</Text>
              </View>
            </View>
          )}

          {/* Story Counter */}
          <View 
            className="absolute right-4 px-3 py-2 rounded-full"
            style={{ 
              top: insets.top + 50,
              backgroundColor: 'rgba(255,255,255,0.2)' 
            }}
          >
            <Text className="text-white text-sm font-medium">
              {currentIndex + 1} / {stories.length}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
};

export default FullScreenStoriesDisplay;