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
    if (!supabase) {
      return { success: false, error: 'Supabase no está configurado en la app' };
    }

    // Prevent duplicates by URL for the same user
    const { data: existing, error: existErr } = await supabase
      .from('codex_items')
      .select('id')
      .eq('user_id', userId)
      .eq('url', item.url)
      .maybeSingle();

    if (!existErr && existing?.id) {
      return { success: true, id: existing.id };
    }

    const payload: any = {
      user_id: userId,
      tipo: 'enlace',
      titulo: item.title || item.domain,
      descripcion: item.description || null,
      etiquetas: [],
      proyecto: null,
      project_id: null,
      storage_path: null,
      url: item.url,
      source_url: item.url,
      nombre_archivo: null,
      tamano: null,
      fecha: new Date().toISOString(),
      original_type: item.type || 'link',
      content: {
        platform: item.platform,
        image: item.image,
        author: item.author,
        domain: item.domain,
        saved_at: item.timestamp,
      },
    };

    const { data, error } = await supabase
      .from('codex_items')
      .insert([payload])
      .select('id')
      .single();

    if (error) throw error;

    return { success: true, id: data?.id };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error guardando en Codex' };
  }
}


