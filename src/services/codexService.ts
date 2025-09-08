import { supabase } from '../config/supabase';
import type { SavedItem } from '../state/savedStore';

export interface CodexSaveResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Save a saved link into Pulse Journal Codex (codex_items)
 * Requires: Supabase env configured and a valid Pulse user id
 */
export async function saveLinkToCodex(userId: string, item: SavedItem): Promise<CodexSaveResult> {
  try {
    // Use backend endpoint to handle RLS complexities and user mapping
    const response = await fetch('https://server.standatpd.com/api/codex/save-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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


