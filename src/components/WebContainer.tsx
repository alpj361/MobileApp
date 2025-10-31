/**
 * WebContainer
 * Wrapper component that adapts UI for web platform
 * Makes web app look exactly like mobile app
 */
import React from 'react';
import { View, Platform, Dimensions, StyleSheet } from 'react-native';

interface WebContainerProps {
  children: React.ReactNode;
}

export function WebContainer({ children }: WebContainerProps) {
  // En móvil nativo, simplemente renderizar children sin wrapper
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  // En web, determinar si es mobile o desktop
  const { width, height } = Dimensions.get('window');
  const isMobile = width < 768;

  // Mobile web: comportamiento exacto a app nativa (full width, full height)
  if (isMobile) {
    return (
      <View style={styles.mobileWebContainer}>
        {children}
      </View>
    );
  }

  // Desktop: simular app móvil centrada (como iPhone en pantalla grande)
  return (
    <View style={styles.desktopWrapper}>
      <View style={styles.mobileFrame}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileWebContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  desktopWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5', // Gris claro para simular "fuera del móvil"
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileFrame: {
    width: 428, // iPhone 14 Pro width
    height: '100%',
    maxHeight: 926, // iPhone 14 Pro height
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? 0 : 0, // Sin border radius por ahora
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    // @ts-ignore - web-specific
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
  },
});



