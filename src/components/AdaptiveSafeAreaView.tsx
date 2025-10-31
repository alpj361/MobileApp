/**
 * AdaptiveSafeAreaView
 * Platform-adaptive SafeAreaView
 * 
 * - iOS/Android: Uses react-native-safe-area-context
 * - Web: Uses regular View (SafeAreaView causes issues in web)
 */
import React from 'react';
import { Platform, View, ViewProps } from 'react-native';
import { SafeAreaView as RNSafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';

type AdaptiveSafeAreaViewProps = SafeAreaViewProps & ViewProps;

export function AdaptiveSafeAreaView({ 
  children, 
  style, 
  ...props 
}: AdaptiveSafeAreaViewProps) {
  // En web, usar View regular sin safe area
  if (Platform.OS === 'web') {
    return (
      <View style={[{ flex: 1 }, style]} {...props}>
        {children}
      </View>
    );
  }

  // En iOS/Android, usar SafeAreaView nativo
  return (
    <RNSafeAreaView style={[{ flex: 1 }, style]} {...props}>
      {children}
    </RNSafeAreaView>
  );
}

// Export también como SafeAreaView para facilitar imports
export { AdaptiveSafeAreaView as SafeAreaView };

