import { supabase } from '../config/supabase';
import type { SavedItem } from '../state/savedStore';
import type { Recording } from '../state/recordingStore';

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
 * Updated to handle new Google OAuth flow with PKCE
 */
async function checkSupabaseSession(): Promise<{ session: any; error: string | null }> {
  try {
    // First try to get current session
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // If no session found, don't try to refresh automatically
    // The new Google OAuth flow with PKCE doesn't use Supabase's built-in session management
    if (!session?.access_token) {
      console.log('No active Supabase session found - this is expected with the new Google OAuth flow');
      return { 
        session: null, 
        error: null // Don't treat this as an error, just return null session
      };
    }
    
    if (sessionError) {
      console.error('Supabase session error:', sessionError);
      return { 
        session: null, 
        error: 'Error en la sesión de Supabase.' 
      };
    }
    
    return { session, error: null };
  } catch (error) {
    console.error('Error checking Supabase session:', error);
    return { 
      session: null, 
      error: null // Don't treat this as a critical error
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
 * Check if a link already exists in the user's codex
 */
async function checkLinkExists(userId: string, url: string): Promise<{ exists: boolean; id?: string }> {
  try {
    // Get Pulse user data for authentication
    const pulseConnectionStore = require('../state/pulseConnectionStore').usePulseConnectionStore.getState();
    const pulseUser = pulseConnectionStore.connectedUser;
    
    if (!pulseUser) {
      return { exists: false };
    }

    const response = await fetch('https://server.standatpd.com/api/codex/check-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        url: url,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return { exists: result.exists, id: result.id };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Error checking if link exists:', error);
    return { exists: false };
  }
}

/**
 * Check if multiple links already exist in the user's codex
 * Returns a map of URL -> { exists: boolean, id?: string }
 */
export async function checkMultipleLinksExist(userId: string, urls: string[]): Promise<Record<string, { exists: boolean; id?: string }>> {
  try {
    // Get Pulse user data for authentication
    const pulseConnectionStore = require('../state/pulseConnectionStore').usePulseConnectionStore.getState();
    const pulseUser = pulseConnectionStore.connectedUser;
    
    if (!pulseUser) {
      // Return all as not existing if no pulse user
      return urls.reduce((acc, url) => ({ ...acc, [url]: { exists: false } }), {});
    }

    const response = await fetch('https://server.standatpd.com/api/codex/check-multiple-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        urls: urls,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result.linkStatus || {};
    }
    
    // If request fails, return all as not existing
    return urls.reduce((acc, url) => ({ ...acc, [url]: { exists: false } }), {});
  } catch (error) {
    console.error('Error checking if multiple links exist:', error);
    // Return all as not existing on error
    return urls.reduce((acc, url) => ({ ...acc, [url]: { exists: false } }), {});
  }
}

/**
 * Check codex status for all saved items at once
 * This checks directly against the database using codex_id when available
 */
export async function checkAllSavedItemsCodexStatus(items: SavedItem[]): Promise<Record<string, { exists: boolean; id?: string }>> {
  try {
    // Get Pulse user data for authentication
    const pulseConnectionStore = require('../state/pulseConnectionStore').usePulseConnectionStore.getState();
    const pulseUser = pulseConnectionStore.connectedUser;
    
    if (!pulseUser || items.length === 0) {
      // Return all as not existing if no pulse user or no items
      return items.reduce((acc, item) => ({ ...acc, [item.url]: { exists: false } }), {});
    }

    // First, check items that already have codex_id (they're definitely saved)
    const statusMap: Record<string, { exists: boolean; id?: string }> = {};
    
    items.forEach(item => {
      if (item.codex_id) {
        // Item has codex_id, so it's definitely saved
        statusMap[item.url] = { exists: true, id: item.codex_id };
      } else {
        // Item doesn't have codex_id, check if it exists in database
        statusMap[item.url] = { exists: false };
      }
    });

    // For items without codex_id, check if they exist in the database
    const itemsWithoutCodexId = items.filter(item => !item.codex_id);
    if (itemsWithoutCodexId.length > 0) {
      const urls = itemsWithoutCodexId.map(item => item.url);
      const dbStatus = await checkMultipleLinksExist(pulseUser.id, urls);
      
      // Update status map with database results
      Object.entries(dbStatus).forEach(([url, status]) => {
        statusMap[url] = status;
      });
    }

    return statusMap;
  } catch (error) {
    console.error('Error checking all saved items codex status:', error);
    // Return all as not existing on error
    return items.reduce((acc, item) => ({ ...acc, [item.url]: { exists: false } }), {});
  }
}

/**
 * Save a saved link into Pulse Journal Codex (codex_items)
 * Updated to work with new Google OAuth flow and check for duplicates
 */
export async function saveLinkToCodex(userId: string, item: SavedItem): Promise<CodexSaveResult> {
  try {
    // First check if the link already exists
    const { exists, id } = await checkLinkExists(userId, item.url);
    if (exists) {
      return { 
        success: true, 
        id: id,
        error: 'Este enlace ya está guardado en tu Codex.' 
      };
    }

    // Check if user has a valid Supabase session
    const { session, error: sessionError } = await checkSupabaseSession();
    
    let response;
    
    if (sessionError || !session) {
      console.log('No Supabase session available, using Pulse authentication...');
      
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
            engagement: item.engagement,
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
            engagement: item.engagement,
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
      // Update the saved item with the codex_id
      const savedStore = require('../state/savedStore').useSavedStore.getState();
        const savedItem = savedStore.getSavedItems().find((savedItem: SavedItem) => savedItem.url === item.url);
      if (savedItem) {
        savedStore.setCodexId(savedItem.id, result.id);
      }
      
      return { success: true, id: result.id };
    } else {
      return { success: false, error: result.error || 'Error guardando en Codex' };
    }
  } catch (error: any) {
    console.error('Error saving to Codex via backend:', error);
    return { success: false, error: error?.message || 'Error conectando con el servidor' };
  }
}

/**
 * Save an audio recording to Pulse Journal Codex
 * This function uploads the audio file and creates a codex item
 */
export async function saveRecordingToCodex(userId: string, recording: Recording): Promise<CodexSaveResult> {
  try {
    // Get Pulse user data for authentication
    const pulseConnectionStore = require('../state/pulseConnectionStore').usePulseConnectionStore.getState();
    const pulseUser = pulseConnectionStore.connectedUser;
    
    if (!pulseUser) {
      return { 
        success: false, 
        error: 'No se encontró una conexión válida con Pulse Journal. Por favor, ve a Configuración y conecta tu cuenta.' 
      };
    }

    // Check if user has a valid Supabase session
    const { session, error: sessionError } = await checkSupabaseSession();
    
    let response;
    
    if (sessionError || !session) {
      console.log('No Supabase session available, using Pulse authentication...');
      
      // Use the alternative endpoint that doesn't require Supabase session
      response = await fetch('https://server.standatpd.com/api/codex/save-recording-pulse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          pulse_user_email: pulseUser.email,
          recording_data: {
            title: recording.title,
            duration: recording.duration,
            transcription: recording.transcription,
            timestamp: recording.timestamp,
            audio_uri: recording.uri,
          },
        }),
      });
    } else {
      // Use the standard endpoint with Supabase authentication
      response = await fetch('https://server.standatpd.com/api/codex/save-recording', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          recording_data: {
            title: recording.title,
            duration: recording.duration,
            transcription: recording.transcription,
            timestamp: recording.timestamp,
            audio_uri: recording.uri,
          },
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Error desconocido');
      console.error('Backend save recording to Codex failed:', response.status, errorText);
      throw new Error(`Error del servidor: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      // Add the recording to the saved store so it appears on the saved page
      const savedStore = require('../state/savedStore').useSavedStore.getState();
      const audioItem = {
        url: recording.uri, // Use the audio URI as the URL
        title: recording.title,
        description: recording.transcription || 'Grabación de audio',
        type: 'audio' as const,
        domain: 'audio-recording',
        timestamp: recording.timestamp,
        platform: 'audio' as const,
        author: 'Usuario',
        image: undefined,
        favicon: undefined,
      };
      
      // Add to saved store with codex_id
      await savedStore.addSavedItem(audioItem, 'manual');
      
      // Find the newly added item and set its codex_id
      const savedItems = savedStore.getSavedItems();
      const newItem = savedItems.find((item: SavedItem) => item.url === recording.uri && item.title === recording.title);
      if (newItem) {
        savedStore.setCodexId(newItem.id, result.id);
      }
      
      return { success: true, id: result.id };
    } else {
      return { success: false, error: result.error || 'Error guardando grabación en Codex' };
    }
  } catch (error: any) {
    console.error('Error saving recording to Codex via backend:', error);
    return { success: false, error: error?.message || 'Error conectando con el servidor' };
  }
}


