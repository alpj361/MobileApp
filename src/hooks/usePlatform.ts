/**
 * Platform Detection Hook
 * Detecta si la app está corriendo en móvil nativo o web
 */
import { Platform } from 'react-native';
import { useEffect, useState } from 'react';

export type AppPlatform = 'mobile-app' | 'mobile-web';

export function usePlatform(): AppPlatform {
  const [platform, setPlatform] = useState<AppPlatform>(
    Platform.OS === 'web' ? 'mobile-web' : 'mobile-app'
  );

  useEffect(() => {
    // Detectar si está en web
    if (Platform.OS === 'web') {
      setPlatform('mobile-web');
    } else {
      setPlatform('mobile-app');
    }
  }, []);

  return platform;
}

/**
 * Detecta si está corriendo en web
 */
export function isWeb(): boolean {
  return Platform.OS === 'web';
}

/**
 * Detecta si está corriendo en móvil nativo
 */
export function isMobileApp(): boolean {
  return Platform.OS !== 'web';
}

/**
 * Obtiene el identificador de plataforma para enviar al backend
 */
export function getPlatformHeader(): AppPlatform {
  return Platform.OS === 'web' ? 'mobile-web' : 'mobile-app';
}


