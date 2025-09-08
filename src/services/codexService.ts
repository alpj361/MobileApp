import { supabase } from '../config/supabase';
import type { SavedItem } from '../state/savedStore';

export interface CodexSaveResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Check authentication status for debugging
 */
export async function checkAuthenticationStatus(): Promise<{
  hasPulseConnection: boolean;
  hasSupabaseSession: boolean;
  pulseUser: any;
  supabaseUser: any;
  error?: string;
}> {
  try {
    // Check Pulse connection (from store)
    const pulseConnectionStore = require('../state/pulseConnectionStore').usePulseConnectionStore.getState();
    const hasPulseConnection = pulseConnectionStore.isConnected;
    const pulseUser = pulseConnectionStore.connectedUser;

    // Check Supabase session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const hasSupabaseSession = !!(session?.access_token);
    const supabaseUser = session?.user;

    return {
      hasPulseConnection,
      hasSupabaseSession,
      pulseUser,
      supabaseUser,
      error: sessionError?.message
    };
  } catch (error) {
    return {
      hasPulseConnection: false,
      hasSupabaseSession: false,
      pulseUser: null,
      supabaseUser: null,
      error: (error as Error).message
    };
  }
}

/**
 * Check if user has a valid Supabase session for API calls
 */
async function checkSupabaseSession(): Promise<{ session: any; error: string | null }> {
  try {
    // First try to get current session
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // If no session found, try to refresh it
    if (!session?.access_token && !sessionError) {
      console.log('No active session found, attempting to refresh...');
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Failed to refresh session:', refreshError);
        return { 
          session: null, 
          error: 'La sesión ha expirado. Por favor, inicia sesión nuevamente.' 
        };
      }
      
      session = refreshedSession;
    }
    
    if (sessionError || !session?.access_token) {
      console.error('No valid Supabase session found:', sessionError);
      return { 
        session: null, 
        error: 'No se encontró una sesión válida. Por favor, inicia sesión nuevamente desde la configuración.' 
      };
    }
    
    return { session, error: null };
  } catch (error) {
    console.error('Error checking Supabase session:', error);
    return { 
      session: null, 
      error: 'Error verificando la sesión. Por favor, inicia sesión nuevamente.' 
    };
  }
}

/**
 * Alternative approach: Create a temporary session using the Pulse user data
 * This is a workaround when the normal Supabase session is not available
 */
async function createTemporarySession(pulseUserId: string): Promise<{ session: any; error: string | null }> {
  try {
    // For now, we'll return null and let the backend handle authentication differently
    // This is a placeholder for a more sophisticated approach
    console.log('Attempting to create temporary session for Pulse user:', pulseUserId);
    
    // TODO: Implement a proper session creation mechanism
    // This could involve:
    // 1. Creating a temporary token on the backend
    // 2. Using a different authentication method
    // 3. Modifying the backend to accept Pulse user IDs directly
    
    return { 
      session: null, 
      error: 'Sesión temporal no implementada. Se requiere autenticación completa con Supabase.' 
    };
  } catch (error) {
    console.error('Error creating temporary session:', error);
    return { 
      session: null, 
      error: 'Error creando sesión temporal.' 
    };
  }
}

/**
 * Save a saved link into Pulse Journal Codex (codex_items)
 * Requires: Supabase env configured and a valid Pulse user id
 * 
 * Note: This function requires the user to be authenticated with Supabase.
 * If you get authentication errors, the user needs to:
 * 1. Go to Settings in the app
 * 2. Disconnect and reconnect their Pulse Journal account
 * 3. This will refresh the Supabase session
 */
export async function saveLinkToCodex(userId: string, item: SavedItem): Promise<CodexSaveResult> {
  try {
    // Check if user has a valid Supabase session
    const { session, error: sessionError } = await checkSupabaseSession();
    
    let response;
    
    if (sessionError || !session) {
      console.log('No Supabase session available, trying Pulse authentication...');
      
      // Get Pulse user data for alternative authentication
      const pulseConnectionStore = require('../state/pulseConnectionStore').usePulseConnectionStore.getState();
      const pulseUser = pulseConnectionStore.connectedUser;
      
      if (!pulseUser) {
        return { 
          success: false, 
          error: 'No se encontró una conexión válida con Pulse Journal. Por favor, ve a Configuración y conecta tu cuenta.' 
        };
      }
      
      // Use the alternative endpoint that doesn't require Supabase session
      response = await fetch('https://server.standatpd.com/api/codex/save-link-pulse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          pulse_user_email: pulseUser.email,
          link_data: {
            url: item.url,
            title: item.title,
            description: item.description,
            platform: item.platform,
            image: item.image,
            author: item.author,
            domain: item.domain,
            type: item.type,
            timestamp: item.timestamp,
          },
        }),
      });
    } else {
      // Use the standard endpoint with Supabase authentication
      response = await fetch('https://server.standatpd.com/api/codex/save-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          link_data: {
            url: item.url,
            title: item.title,
            description: item.description,
            platform: item.platform,
            image: item.image,
            author: item.author,
            domain: item.domain,
            type: item.type,
            timestamp: item.timestamp,
          },
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Error desconocido');
      console.error('Backend save to Codex failed:', response.status, errorText);
      throw new Error(`Error del servidor: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      return { success: true, id: result.id };
    } else {
      return { success: false, error: result.error || 'Error guardando en Codex' };
    }
  } catch (error: any) {
    console.error('Error saving to Codex via backend:', error);
    return { success: false, error: error?.message || 'Error conectando con el servidor' };
  }
}


