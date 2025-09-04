/**
 * Animation utilities for consistent micro-interactions
 * Provides reusable animation configurations for common UI patterns
 */

// Common animation durations (in milliseconds)
export const animationDurations = {
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
};

// Common easing curves
export const easingCurves = {
  easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};

// Animation presets for common interactions
export const animationPresets = {
  // Button press feedback
  buttonPress: {
    scale: 0.95,
    duration: animationDurations.fast,
    easing: easingCurves.easeOut,
  },
  
  // Card hover/press
  cardPress: {
    scale: 0.98,
    duration: animationDurations.fast,
    easing: easingCurves.easeOut,
  },
  
  // Fade in/out
  fadeIn: {
    opacity: 1,
    duration: animationDurations.normal,
    easing: easingCurves.easeOut,
  },
  
  fadeOut: {
    opacity: 0,
    duration: animationDurations.normal,
    easing: easingCurves.easeIn,
  },
  
  // Slide animations
  slideInUp: {
    translateY: 0,
    duration: animationDurations.normal,
    easing: easingCurves.easeOut,
  },
  
  slideInDown: {
    translateY: 0,
    duration: animationDurations.normal,
    easing: easingCurves.easeOut,
  },
  
  // Scale animations
  scaleIn: {
    scale: 1,
    duration: animationDurations.normal,
    easing: easingCurves.spring,
  },
  
  scaleOut: {
    scale: 0,
    duration: animationDurations.normal,
    easing: easingCurves.easeIn,
  },
};

// Loading animation configurations
export const loadingAnimations = {
  pulse: {
    scale: [1, 1.05, 1],
    duration: 1500,
    repeat: -1,
    easing: easingCurves.easeInOut,
  },
  
  spin: {
    rotate: '360deg',
    duration: 1000,
    repeat: -1,
    easing: 'linear',
  },
  
  bounce: {
    translateY: [0, -10, 0],
    duration: 1000,
    repeat: -1,
    easing: easingCurves.easeInOut,
  },
};

// Transition configurations for navigation
export const transitionPresets = {
  // Modal presentation
  modal: {
    slideInUp: {
      translateY: '100%',
      duration: animationDurations.normal,
      easing: easingCurves.easeOut,
    },
    slideOutDown: {
      translateY: '100%',
      duration: animationDurations.normal,
      easing: easingCurves.easeIn,
    },
  },
  
  // Page transitions
  page: {
    slideInRight: {
      translateX: '100%',
      duration: animationDurations.normal,
      easing: easingCurves.easeOut,
    },
    slideOutLeft: {
      translateX: '-100%',
      duration: animationDurations.normal,
      easing: easingCurves.easeIn,
    },
  },
};

// Spring animation configurations
export const springConfigs = {
  gentle: {
    damping: 20,
    stiffness: 300,
    mass: 1,
  },
  
  bouncy: {
    damping: 10,
    stiffness: 400,
    mass: 1,
  },
  
  snappy: {
    damping: 25,
    stiffness: 500,
    mass: 1,
  },
};

// Utility functions for creating consistent animations
export const createFadeAnimation = (
  toValue: number,
  duration: number = animationDurations.normal
) => ({
  opacity: toValue,
  duration,
  easing: toValue > 0 ? easingCurves.easeOut : easingCurves.easeIn,
});

export const createScaleAnimation = (
  toValue: number,
  duration: number = animationDurations.normal
) => ({
  scale: toValue,
  duration,
  easing: toValue > 1 ? easingCurves.spring : easingCurves.easeOut,
});

export const createSlideAnimation = (
  direction: 'up' | 'down' | 'left' | 'right',
  toValue: number,
  duration: number = animationDurations.normal
) => {
  const property = direction === 'up' || direction === 'down' ? 'translateY' : 'translateX';
  return {
    [property]: toValue,
    duration,
    easing: easingCurves.easeOut,
  };
};

// Animation timing helpers
export const staggerDelay = (index: number, baseDelay: number = 50) => {
  return index * baseDelay;
};

export const createStaggeredAnimation = (
  items: any[],
  animationConfig: any,
  staggerMs: number = 50
) => {
  return items.map((_, index) => ({
    ...animationConfig,
    delay: staggerDelay(index, staggerMs),
  }));
};