/**
 * Typography utility system for consistent text hierarchy
 * Provides standardized text styles following iOS Human Interface Guidelines
 */

export const typography = {
  // Display text - for large titles and hero content
  display: {
    large: "text-4xl font-bold leading-tight",
    medium: "text-3xl font-bold leading-tight", 
    small: "text-2xl font-bold leading-tight"
  },
  
  // Headlines - for section titles and important headings
  headline: {
    large: "text-xl font-semibold leading-snug",
    medium: "text-lg font-semibold leading-snug",
    small: "text-base font-semibold leading-snug"
  },
  
  // Body text - for main content
  body: {
    large: "text-lg font-normal leading-relaxed",
    medium: "text-base font-normal leading-relaxed",
    small: "text-sm font-normal leading-relaxed"
  },
  
  // Labels - for UI elements and form labels
  label: {
    large: "text-base font-medium leading-normal",
    medium: "text-sm font-medium leading-normal", 
    small: "text-xs font-medium leading-normal"
  },
  
  // Caption - for secondary information
  caption: {
    large: "text-sm font-normal leading-normal",
    medium: "text-xs font-normal leading-normal",
    small: "text-xs font-light leading-normal"
  }
};

// Color variants for text
export const textColors = {
  primary: "text-gray-900",
  secondary: "text-gray-600", 
  tertiary: "text-gray-500",
  accent: "text-blue-600",
  success: "text-green-600",
  warning: "text-yellow-600",
  error: "text-red-600",
  white: "text-white",
  inverse: "text-white"
};

// Helper function to combine typography with color
export const getTextStyle = (
  type: keyof typeof typography,
  size: 'large' | 'medium' | 'small',
  color: keyof typeof textColors = 'primary'
): string => {
  return `${typography[type][size]} ${textColors[color]}`;
};

// Common text combinations for quick use
export const textStyles = {
  // Navigation and headers
  navTitle: getTextStyle('headline', 'large', 'primary'),
  sectionTitle: getTextStyle('headline', 'medium', 'primary'),
  cardTitle: getTextStyle('headline', 'small', 'primary'),
  cardTitleLarge: getTextStyle('headline', 'large', 'primary'),

  // Content text
  bodyText: getTextStyle('body', 'medium', 'primary'),
  bodySecondary: getTextStyle('body', 'medium', 'secondary'),
  description: getTextStyle('body', 'small', 'secondary'),
  
  // UI elements
  buttonText: getTextStyle('label', 'medium', 'white'),
  inputLabel: getTextStyle('label', 'medium', 'primary'),
  tabLabel: getTextStyle('label', 'small', 'secondary'),
  
  // Meta information
  timestamp: getTextStyle('caption', 'medium', 'tertiary'),
  badge: getTextStyle('caption', 'small', 'primary'),
  helper: getTextStyle('caption', 'medium', 'secondary')
};
