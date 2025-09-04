/**
 * Responsive design utilities for different screen sizes
 * Provides consistent breakpoints and responsive spacing
 */

import { Dimensions, PixelRatio } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Screen size breakpoints
export const breakpoints = {
  small: 375,   // iPhone SE, small phones
  medium: 414,  // iPhone 11 Pro Max, most phones
  large: 768,   // iPad mini, small tablets
  xlarge: 1024, // iPad, large tablets
};

// Current screen size category
export const getScreenSize = () => {
  if (screenWidth < breakpoints.small) return 'xs';
  if (screenWidth < breakpoints.medium) return 'small';
  if (screenWidth < breakpoints.large) return 'medium';
  if (screenWidth < breakpoints.xlarge) return 'large';
  return 'xlarge';
};

// Responsive spacing based on screen size
export const responsiveSpacing = {
  xs: {
    horizontal: 12,
    vertical: 8,
    section: 16,
    card: 12,
  },
  small: {
    horizontal: 16,
    vertical: 12,
    section: 20,
    card: 16,
  },
  medium: {
    horizontal: 20,
    vertical: 16,
    section: 24,
    card: 20,
  },
  large: {
    horizontal: 24,
    vertical: 20,
    section: 32,
    card: 24,
  },
  xlarge: {
    horizontal: 32,
    vertical: 24,
    section: 40,
    card: 32,
  },
};

// Get current responsive spacing
export const getCurrentSpacing = () => {
  const screenSize = getScreenSize();
  return responsiveSpacing[screenSize];
};

// Responsive font sizes
export const responsiveFontSizes = {
  xs: {
    display: 24,
    headline: 18,
    body: 14,
    caption: 11,
  },
  small: {
    display: 28,
    headline: 20,
    body: 16,
    caption: 12,
  },
  medium: {
    display: 32,
    headline: 22,
    body: 16,
    caption: 12,
  },
  large: {
    display: 36,
    headline: 24,
    body: 18,
    caption: 14,
  },
  xlarge: {
    display: 40,
    headline: 28,
    body: 20,
    caption: 16,
  },
};

// Get current responsive font sizes
export const getCurrentFontSizes = () => {
  const screenSize = getScreenSize();
  return responsiveFontSizes[screenSize];
};

// Responsive dimensions
export const responsiveDimensions = {
  // Touch target sizes (minimum 44px for accessibility)
  touchTarget: {
    small: Math.max(44, screenWidth * 0.12),
    medium: Math.max(48, screenWidth * 0.13),
    large: Math.max(52, screenWidth * 0.14),
  },
  
  // Card and container widths
  container: {
    maxWidth: Math.min(screenWidth - 32, 600), // Max width with padding
    cardWidth: screenWidth - 40, // Full width cards with margin
  },
  
  // Icon sizes
  icon: {
    small: screenWidth < breakpoints.small ? 16 : 18,
    medium: screenWidth < breakpoints.small ? 20 : 24,
    large: screenWidth < breakpoints.small ? 24 : 28,
  },
};

// Utility functions
export const isSmallScreen = () => screenWidth < breakpoints.medium;
export const isMediumScreen = () => screenWidth >= breakpoints.medium && screenWidth < breakpoints.large;
export const isLargeScreen = () => screenWidth >= breakpoints.large;

// Scale function for responsive sizing
export const scale = (size: number) => {
  const baseWidth = 375; // iPhone SE width as base
  return (screenWidth / baseWidth) * size;
};

// Moderate scale for text (less aggressive scaling)
export const moderateScale = (size: number, factor: number = 0.5) => {
  return size + (scale(size) - size) * factor;
};

// Get responsive padding classes
export const getResponsivePadding = (type: 'screen' | 'card' | 'section' = 'screen') => {
  const spacing = getCurrentSpacing();
  
  switch (type) {
    case 'screen':
      return `px-${Math.floor(spacing.horizontal / 4)} py-${Math.floor(spacing.vertical / 4)}`;
    case 'card':
      return `p-${Math.floor(spacing.card / 4)}`;
    case 'section':
      return `py-${Math.floor(spacing.section / 4)}`;
    default:
      return `p-4`;
  }
};

// Screen info for debugging
export const screenInfo = {
  width: screenWidth,
  height: screenHeight,
  pixelRatio: PixelRatio.get(),
  fontScale: PixelRatio.getFontScale(),
  size: getScreenSize(),
  isSmall: isSmallScreen(),
  isMedium: isMediumScreen(),
  isLarge: isLargeScreen(),
};