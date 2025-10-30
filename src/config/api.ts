/**
 * API Configuration
 * Configuración centralizada para todas las llamadas al backend
 */
import { getPlatformHeader } from '../hooks/usePlatform';

/**
 * Obtiene los headers comunes para todas las requests
 */
export function getCommonHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Platform': getPlatformHeader(),
  };
}

/**
 * Obtiene los headers con autenticación
 */
export function getAuthHeaders(token?: string): Record<string, string> {
  const headers = getCommonHeaders();
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Agrega parámetro de plataforma a una URL
 */
export function addPlatformParam(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}platform=${getPlatformHeader()}`;
}


