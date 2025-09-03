import { supabase } from '../config/supabase';

export interface PulseUser {
  id: string;
  email: string;
  user_type: string;
  role: string;
  credits: number;
  created_at: string;
}

export interface ConnectionResult {
  success: boolean;
  user?: PulseUser;
  error?: string;
}

/**
 * Verificar si un usuario existe en la base de datos de Pulse Journal
 */
export async function verifyPulseUser(email: string): Promise<PulseUser | null> {
  if (!supabase) {
    console.warn('Supabase not configured');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, user_type, role, credits, created_at')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No se encontró el usuario
        return null;
      }
      throw error;
    }

    return data as PulseUser;
  } catch (error) {
    console.error('Error verifying Pulse user:', error);
    return null;
  }
}

/**
 * Conectar usando Google OAuth
 * Usa el mismo client ID que Pulse Journal para consistencia
 */
/**
 * Conectar usando Google OAuth
 * DEPRECATED: Use useGoogleAuth hook instead
 * This function is kept for backward compatibility but should not be used
 */

/**
 * Conectar usando email y password
 * Nota: Solo verifica que el usuario existe, no autentica completamente
 */
export async function connectWithEmail(email: string, _password: string): Promise<ConnectionResult> {
  try {
    // Para la conexión simple, solo verificamos que el usuario existe
    // En el futuro se puede agregar autenticación completa
    const pulseUser = await verifyPulseUser(email);
    
    if (pulseUser) {
      return {
        success: true,
        user: pulseUser,
      };
    } else {
      return {
        success: false,
        error: 'No se encontró una cuenta de Pulse Journal con este email.',
      };
    }
  } catch (error) {
    console.error('Error connecting with email:', error);
    return {
      success: false,
      error: 'Error durante la conexión. Verifica tu email e intenta de nuevo.',
    };
  }
}

/**
 * Validar formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
