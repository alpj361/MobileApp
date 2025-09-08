import { supabase } from '../config/supabase';
import type { SavedItem } from '../state/savedStore';

export interface CodexSaveResult {
  success: boolean;
  id?: string;
  error?: string;
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
    
    if (sessionError || !session) {
      return { 
        success: false, 
        error: sessionError || 'No se pudo verificar la sesión.' 
      };
    }

    // Use backend endpoint to handle RLS complexities and user mapping
    const response = await fetch('https://server.standatpd.com/api/codex/save-link', {
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


