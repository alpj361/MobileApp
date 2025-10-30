import { getXDataFromCache, setXDataToCache } from '../storage/xDataCache';
import { getCommonHeaders, addPlatformParam } from '../config/api';

const BASE_URL = process.env.EXPO_PUBLIC_EXTRACTORW_URL ?? 'https://server.standatpd.com';

// Deduplication: Track URLs currently being fetched
const runningMediaFetches = new Set<string>();

export type XMediaType = 'video' | 'image' | 'text';

export interface XMedia {
  type: XMediaType;
  url?: string;
  urls?: string[]; // Multiple images
  thumbnail?: string;
  duration?: number;
  size?: number;
  width?: number;
  height?: number;
  format?: string;
}

interface XMediaApiResponse {
  success: boolean;
  type?: XMediaType;
  video_url?: string;
  images?: string[];
  thumbnail_url?: string;
  duration?: number;
  post_id?: string;
  tweet_text?: string;
  tweet_metrics?: {
    likes?: number;
    replies?: number;
    reposts?: number;
    views?: number;
  };
  comments_count?: number;
  media?: {
    type: string;
    url?: string;
    urls?: string[];
    thumbnail?: string;
    metadata?: Record<string, any>;
  };
  content?: {
    text?: string;
    media?: any[];
  };
  transcription?: string;
  error?: { message?: string } | string;
}

/**
 * ✅ OPTIMIZADO: Obtener media usando el servicio unificado
 * Ya NO hace llamadas duplicadas - usa fetchXComplete()
 */
export async function fetchXMedia(url: string): Promise<XMedia> {
  console.log('[X Media] ========== START fetchXMedia ==========');
  console.log('[X Media] URL:', url);
  
  if (!url) {
    throw new Error('URL is required');
  }

  if (!url.includes('twitter.com') && !url.includes('x.com')) {
    throw new Error('Invalid X URL');
  }

  try {
    // ✅ Usar servicio unificado que obtiene TODO en una llamada
    const { fetchXComplete } = await import('./xCompleteService');
    const completeData = await fetchXComplete(url);
    
    console.log('[X Media] ✅ Got media from unified service');
    console.log('[X Media] Media type:', completeData.media.type);
    console.log('[X Media] ========== END fetchXMedia (success) ==========');
    
    return completeData.media;
  } catch (error) {
    console.error('[X Media] ========== ERROR in fetchXMedia ==========');
    console.error('[X Media] Error fetching media:', error);
    throw error;
  }
}
