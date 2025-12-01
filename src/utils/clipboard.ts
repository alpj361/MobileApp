/**
 * Clipboard Utilities
 * Multi-platform clipboard access for web and mobile
 */

import { Platform } from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';

/**
 * Get text from clipboard
 * Uses native clipboard API on web, expo-clipboard on mobile
 * 
 * Note: On web, clipboard.readText() requires:
 * - HTTPS (or localhost)
 * - User gesture (click, touch, etc.)
 * - Permissions may be required in some browsers
 */
export async function getClipboardText(): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      // Use native browser clipboard API
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        try {
          // Check if we're in a secure context (HTTPS or localhost)
          if (typeof window !== 'undefined' && !window.isSecureContext) {
            console.warn('[Clipboard] Not in secure context - clipboard API requires HTTPS');
            throw new Error('Clipboard API requires HTTPS or localhost');
          }
          
          const text = await navigator.clipboard.readText();
          return text || '';
        } catch (error: any) {
          // Provide more specific error messages
          if (error?.name === 'NotAllowedError') {
            throw new Error('Permiso denegado para acceder al portapapeles');
          } else if (error?.name === 'NotFoundError') {
            throw new Error('No hay contenido en el portapapeles');
          } else if (error?.message?.includes('secure context')) {
            throw new Error('El acceso al portapapeles requiere HTTPS');
          } else {
            console.warn('[Clipboard] navigator.clipboard.readText failed:', error);
            throw new Error('Error al leer el portapapeles: ' + (error?.message || 'Desconocido'));
          }
        }
      } else {
        // Fallback: Try expo-clipboard if available (might work in some web contexts)
        try {
          const text = await ExpoClipboard.getStringAsync();
          return text || '';
        } catch (fallbackError) {
          throw new Error('El acceso al portapapeles no está disponible en este navegador');
        }
      }
    } else {
      // Use expo-clipboard for mobile platforms
      const text = await ExpoClipboard.getStringAsync();
      return text || '';
    }
  } catch (error: any) {
    console.error('[Clipboard] Error reading clipboard:', error);
    // Re-throw with original error if it's already a string message
    if (error?.message) {
      throw error;
    }
    throw new Error('Error desconocido al leer el portapapeles');
  }
}

/**
 * Set text to clipboard
 * Uses native clipboard API on web, expo-clipboard on mobile
 */
export async function setClipboardText(text: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // Use native browser clipboard API
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API not available');
      }
    } else {
      // Use expo-clipboard for mobile platforms
      await ExpoClipboard.setStringAsync(text);
    }
  } catch (error) {
    console.error('[Clipboard] Error writing to clipboard:', error);
    throw error;
  }
}

/**
 * Check if clipboard API is available
 */
export function isClipboardAvailable(): boolean {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' && 
           navigator.clipboard !== undefined && 
           navigator.clipboard.readText !== undefined;
  }
  return true; // expo-clipboard is always available on mobile
}

