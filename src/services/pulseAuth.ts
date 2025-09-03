import { supabase } from '../config/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';

// Configuración de Google OAuth (mismo client ID que Pulse Journal)
const GOOGLE_CLIENT_ID = '80973030831-7v96jltgkg4r31r8n68du9vjpjutuq3o.apps.googleusercontent.com';

// Configurar WebBrowser para mejor UX en OAuth
WebBrowser.maybeCompleteAuthSession();

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
export async function connectWithGoogle(): Promise<ConnectionResult> {
  try {
    // Configurar la petición de OAuth
    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
    
    // Crear code verifier para PKCE
    const codeChallenge = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      await Crypto.getRandomBytesAsync(32).then(bytes => 
        Array.from(bytes, byte => String.fromCharCode(byte)).join('')
      ),
      { encoding: Crypto.CryptoEncoding.BASE64URL }
    );

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256`;

    // Abrir el navegador de autenticación
    const result = await AuthSession.startAsync({
      authUrl,
      returnUrl: redirectUri,
    });

    if (result.type === 'success' && result.params.code) {
      // Intercambiar el código por tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          code: result.params.code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code_verifier: codeChallenge,
        }).toString(),
      });

      const tokens = await tokenResponse.json();

      if (tokens.access_token) {
        // Obtener información del usuario de Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        });

        const userInfo = await userInfoResponse.json();

        if (userInfo.email) {
          // Verificar si el usuario existe en Pulse Journal
          const pulseUser = await verifyPulseUser(userInfo.email);
          
          if (pulseUser) {
            return {
              success: true,
              user: pulseUser,
            };
          } else {
            return {
              success: false,
              error: 'No se encontró una cuenta de Pulse Journal asociada a este email.',
            };
          }
        }
      }
    }

    return {
      success: false,
      error: 'La autenticación con Google fue cancelada o falló.',
    };
  } catch (error) {
    console.error('Error connecting with Google:', error);
    return {
      success: false,
      error: 'Error durante la conexión con Google. Intenta de nuevo.',
    };
  }
}

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
