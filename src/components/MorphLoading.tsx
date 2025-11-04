import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';

interface MorphLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function MorphLoading({ size = 'md', className }: MorphLoadingProps) {
  // Animated values for each morph circle
  const morph0 = useRef(new Animated.Value(0)).current;
  const morph1 = useRef(new Animated.Value(0)).current;
  const morph2 = useRef(new Animated.Value(0)).current;
  const morph3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create staggered morph animations for each circle
    const createMorphAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1,
            duration: 2000,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    // Start all animations with staggered delays
    Animated.parallel([
      createMorphAnimation(morph0, 0),
      createMorphAnimation(morph1, 200),
      createMorphAnimation(morph2, 400),
      createMorphAnimation(morph3, 600),
    ]).start();
  }, [morph0, morph1, morph2, morph3]);

  // Size configurations
  const containerSizes = {
    sm: 64,
    md: 96,
    lg: 128,
  };

  const circleSize = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  const containerSize = containerSizes[size];
  const dotSize = circleSize[size];

  // Morph 0 - moves right-up in a wave pattern
  const morph0Transform = {
    translateX: morph0.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0, 20, 40, 20, 0],
    }),
    translateY: morph0.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0, -20, 0, 20, 0],
    }),
    scale: morph0.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [1, 1.2, 0.8, 1.1, 1],
    }),
  };

  // Morph 1 - moves left-up with rotation
  const morph1Transform = {
    translateX: morph1.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0, -20, -40, -20, 0],
    }),
    translateY: morph1.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0, -20, 0, 20, 0],
    }),
    scale: morph1.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [1, 1.3, 0.7, 1.2, 1],
    }),
    rotate: morph1.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: ['0deg', '90deg', '180deg', '270deg', '360deg'],
    }),
  };

  // Morph 2 - moves down in a bounce pattern
  const morph2Transform = {
    translateX: morph2.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0, -20, 0, 20, 0],
    }),
    translateY: morph2.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0, 20, 40, 20, 0],
    }),
    scale: morph2.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [1, 0.9, 1.4, 0.8, 1],
    }),
  };

  // Morph 3 - moves up with counter-rotation
  const morph3Transform = {
    translateX: morph3.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0, 20, 0, -20, 0],
    }),
    translateY: morph3.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0, 20, -40, -20, 0],
    }),
    scale: morph3.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [1, 1.1, 1.3, 0.9, 1],
    }),
    rotate: morph3.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: ['0deg', '-90deg', '-180deg', '-270deg', '-360deg'],
    }),
  };

  // Border radius animations to create morph effect
  const getBorderRadius = (animValue: Animated.Value) => {
    return animValue.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0, dotSize / 2, dotSize / 4, (dotSize * 3) / 4, 0],
    });
  };

  return (
    <View style={[styles.container, { width: containerSize, height: containerSize }]} className={className}>
      <View style={styles.innerContainer}>
        {/* Morph 0 */}
        <Animated.View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              transform: [
                { translateX: morph0Transform.translateX },
                { translateY: morph0Transform.translateY },
                { scale: morph0Transform.scale },
              ],
              borderRadius: getBorderRadius(morph0),
            },
          ]}
        />

        {/* Morph 1 */}
        <Animated.View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              transform: [
                { translateX: morph1Transform.translateX },
                { translateY: morph1Transform.translateY },
                { scale: morph1Transform.scale },
                { rotate: morph1Transform.rotate },
              ],
              borderRadius: getBorderRadius(morph1),
            },
          ]}
        />

        {/* Morph 2 */}
        <Animated.View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              transform: [
                { translateX: morph2Transform.translateX },
                { translateY: morph2Transform.translateY },
                { scale: morph2Transform.scale },
              ],
              borderRadius: getBorderRadius(morph2),
            },
          ]}
        />

        {/* Morph 3 */}
        <Animated.View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              transform: [
                { translateX: morph3Transform.translateX },
                { translateY: morph3Transform.translateY },
                { scale: morph3Transform.scale },
                { rotate: morph3Transform.rotate },
              ],
              borderRadius: getBorderRadius(morph3),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    position: 'absolute',
    backgroundColor: '#7C3AED', // Purple to match app theme
    opacity: 0.8, // Slightly transparent for softer look
    elevation: 3, // Android shadow
    ...(Platform.OS === 'web' 
      ? {
          // @ts-ignore - web-specific
          boxShadow: '0 2px 4px rgba(124, 58, 237, 0.3)',
        }
      : {
          shadowColor: '#7C3AED',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        }
    ),
  },
});

