import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  useReducedMotion,
} from 'react-native-reanimated';

interface AnimatedCircleProps {
  isAnimating: boolean;
  size?: number;
  color?: string;
}

export default function AnimatedCircle({ 
  isAnimating, 
  size = 80, 
  color = '#000000' 
}: AnimatedCircleProps) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (isAnimating && !reducedMotion) {
      // Start floating animation - gentle up and down movement
      translateY.value = withRepeat(
        withSequence(
          withSpring(-8, { 
            damping: 18, 
            stiffness: 120
          }),
          withSpring(8, { 
            damping: 18, 
            stiffness: 120
          })
        ),
        -1, // infinite repeat
        true // reverse
      );

      // Start scale pulsing - subtle size changes
      scale.value = withRepeat(
        withSequence(
          withSpring(1.05, { 
            damping: 15, 
            stiffness: 100
          }),
          withSpring(0.98, { 
            damping: 15, 
            stiffness: 100
          })
        ),
        -1, // infinite repeat
        true // reverse
      );
    } else {
      // Stop animations and return to neutral state
      translateY.value = withSpring(0, { 
        damping: 20, 
        stiffness: 200 
      });
      scale.value = withSpring(1, { 
        damping: 20, 
        stiffness: 200 
      });
    }
  }, [isAnimating, reducedMotion, translateY, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: size / 2,
        },
        animatedStyle,
      ]}
    />
  );
}