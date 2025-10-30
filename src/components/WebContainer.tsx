/**
 * WebContainer
 * Wrapper component that adapts UI for web platform
 */
import React from 'react';
import { View, Platform, Dimensions } from 'react-native';

interface WebContainerProps {
  children: React.ReactNode;
}

export function WebContainer({ children }: WebContainerProps) {
  // En móvil nativo, simplemente renderizar children
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  // En web, agregar contenedor con max-width
  const { width } = Dimensions.get('window');
  const isDesktop = width >= 768;

  if (!isDesktop) {
    // En móvil web, renderizar sin wrapper
    return <>{children}</>;
  }

  // En desktop, centrar y limitar ancho
  return (
    <View
      style={{
        flex: 1,
        maxWidth: 428,
        marginHorizontal: 'auto',
        backgroundColor: '#fff',
      }}
    >
      {children}
    </View>
  );
}



