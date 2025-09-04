/**
 * Color system for consistent theming across the app
 * Based on Tailwind CSS color palette with semantic naming
 */

export const colors = {
  // Primary brand colors
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE', 
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // Main brand color
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Neutral grays
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Semantic colors
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },

  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },

  // Background colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
  },

  // Surface colors (for cards, modals, etc.)
  surface: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    elevated: '#FFFFFF', // with shadow
  },

  // Border colors
  border: {
    light: '#F3F4F6',
    medium: '#E5E7EB',
    dark: '#D1D5DB',
  },
};

// Tailwind class mappings for easy use
export const colorClasses = {
  // Background classes
  bg: {
    primary: 'bg-white',
    secondary: 'bg-gray-50',
    tertiary: 'bg-gray-100',
    accent: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  },

  // Text classes
  text: {
    primary: 'text-gray-900',
    secondary: 'text-gray-600',
    tertiary: 'text-gray-500',
    accent: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    white: 'text-white',
  },

  // Border classes
  border: {
    light: 'border-gray-100',
    medium: 'border-gray-200',
    dark: 'border-gray-300',
    accent: 'border-blue-500',
    success: 'border-green-500',
    warning: 'border-yellow-500',
    error: 'border-red-500',
  },
};

// Category-specific color mappings
export const categoryColors = {
  política: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: '#B91C1C',
  },
  economía: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: '#047857',
  },
  deportes: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: '#1D4ED8',
  },
  entretenimiento: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: '#7C3AED',
  },
  tecnología: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    icon: '#374151',
  },
  sociedad: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    icon: '#A16207',
  },
  default: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    icon: '#374151',
  },
};

// Status colors for different states
export const statusColors = {
  active: {
    bg: 'bg-blue-500',
    text: 'text-white',
    border: 'border-blue-500',
  },
  inactive: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-200',
  },
  loading: {
    bg: 'bg-gray-200',
    text: 'text-gray-500',
    border: 'border-gray-300',
  },
  disabled: {
    bg: 'bg-gray-100',
    text: 'text-gray-400',
    border: 'border-gray-200',
  },
};