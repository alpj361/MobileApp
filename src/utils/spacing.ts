/**
 * Spacing utility system for consistent layout spacing
 * Based on 4px grid system following design best practices
 */

export const spacing = {
  // Base spacing units (4px grid)
  xs: 4,   // 4px
  sm: 8,   // 8px  
  md: 12,  // 12px
  lg: 16,  // 16px
  xl: 20,  // 20px
  '2xl': 24, // 24px
  '3xl': 32, // 32px
  '4xl': 40, // 40px
  '5xl': 48, // 48px
  '6xl': 64, // 64px
};

// Tailwind spacing classes for consistent usage
export const spacingClasses = {
  // Padding classes
  padding: {
    xs: "p-1",     // 4px
    sm: "p-2",     // 8px
    md: "p-3",     // 12px
    lg: "p-4",     // 16px
    xl: "p-5",     // 20px
    '2xl': "p-6",  // 24px
    '3xl': "p-8",  // 32px
    '4xl': "p-10", // 40px
    '5xl': "p-12", // 48px
    '6xl': "p-16", // 64px
  },
  
  // Margin classes
  margin: {
    xs: "m-1",     // 4px
    sm: "m-2",     // 8px
    md: "m-3",     // 12px
    lg: "m-4",     // 16px
    xl: "m-5",     // 20px
    '2xl': "m-6",  // 24px
    '3xl': "m-8",  // 32px
    '4xl': "m-10", // 40px
    '5xl': "m-12", // 48px
    '6xl': "m-16", // 64px
  },
  
  // Gap classes for flex/grid layouts
  gap: {
    xs: "gap-1",   // 4px
    sm: "gap-2",   // 8px
    md: "gap-3",   // 12px
    lg: "gap-4",   // 16px
    xl: "gap-5",   // 20px
    '2xl': "gap-6", // 24px
    '3xl': "gap-8", // 32px
    '4xl': "gap-10", // 40px
    '5xl': "gap-12", // 48px
    '6xl': "gap-16", // 64px
  }
};

// Common spacing patterns for different UI elements
export const layoutSpacing = {
  // Screen-level spacing
  screen: {
    horizontal: "px-4", // 16px horizontal padding
    vertical: "py-6",   // 24px vertical padding
    top: "pt-6",        // 24px top padding
    bottom: "pb-6",     // 24px bottom padding
  },
  
  // Card and container spacing
  card: {
    padding: "p-4",     // 16px all around
    margin: "mb-3",     // 12px bottom margin
    gap: "gap-3",       // 12px gap between elements
  },
  
  // List item spacing
  listItem: {
    padding: "py-3 px-4", // 12px vertical, 16px horizontal
    margin: "mb-2",       // 8px bottom margin
    gap: "gap-3",         // 12px gap between elements
  },
  
  // Button spacing
  button: {
    small: "px-3 py-2",   // 12px horizontal, 8px vertical
    medium: "px-4 py-3",  // 16px horizontal, 12px vertical
    large: "px-6 py-4",   // 24px horizontal, 16px vertical
  },
  
  // Input field spacing
  input: {
    padding: "px-4 py-3", // 16px horizontal, 12px vertical
    margin: "mb-4",       // 16px bottom margin
  },
  
  // Section spacing
  section: {
    margin: "mb-6",       // 24px bottom margin
    padding: "py-4",      // 16px vertical padding
    gap: "gap-4",         // 16px gap between elements
  }
};

// Safe area spacing for different screen areas
export const safeAreaSpacing = {
  header: {
    paddingTop: 12,    // Additional padding for status bar
    paddingBottom: 8,  // Padding below header content
  },
  
  footer: {
    paddingTop: 8,     // Padding above footer content
    paddingBottom: 16, // Additional padding for home indicator
  },
  
  content: {
    paddingHorizontal: 16, // Standard horizontal content padding
    paddingVertical: 8,    // Standard vertical content padding
  }
};