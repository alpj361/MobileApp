import { getCommonHeaders } from '../config/api';
import { getXDataFromCache, setXDataToCache } from '../storage/xDataCache';
import { XMedia, XMediaType } from './xMediaService';
import { Platform } from 'react-native';
import { ExtractedEntity } from '../types/entities';

const EXTRACTORT_URL = process.env.EXPO_PUBLIC_EXTRACTORT_URL ?? 'https://api.standatpd.com';

export interface XComment {
  user: string;
  text: string;
  likes: number;
  timestamp?: string;
}

export interface XMetrics {
  likes?: number;
  replies?: number;
  reposts?: number;
  views?: number;
}

export interface XCompleteData {
  success: boolean;
  media: XMedia;
  comments: XComment[];
  metrics: XMetrics;
  transcription?: string;
  vision?: string;
  entities?: ExtractedEntity[];  // ✅ Extracted entities from all sources
  tweet: {
    text: string;
    author_handle?: string;
    author_name?: string;
    created_at?: string;
  };
  thumbnail_url?: string;
}

/**
 * Obtener TODOS los datos de un tweet de X en UNA SOLA llamada
 * Esto incluye: media, comentarios, métricas, transcripción/visión
 */
export async function fetchXComplete(url: string): Promise<XCompleteData> {
  console.log('[X Complete] ========== START fetchXComplete ==========');
  console.log('[X Complete] URL:', url);

  if (!url) {
    throw new Error('URL is required');
  }

  if (!url.includes('twitter.com') && !url.includes('x.com')) {
    throw new Error('Invalid X URL');
  }

  // ✅ CACHE: Verificar caché primero
  const cacheKey = `complete:${url}`;
  const cached = getXDataFromCache(cacheKey);
  if (cached) {
    console.log('[X Complete] 🎯 Cache HIT - returning cached data');
    console.log('[X Complete] ========== END fetchXComplete (cached) ==========');
    return cached;
  }

  console.log('[X Complete] Cache MISS - fetching from ExtractorT');

  // ✅ DETECCIÓN DE PLATAFORMA: En web, usar async service
  // Usar detección más confiable que Platform.OS para evitar problemas de bundling
  const isWeb = typeof window !== 'undefined' && typeof window.document !== 'undefined';
  console.log('[X Complete] 🔍 Platform detection:', {
    platformOS: Platform.OS,
    hasWindow: typeof window !== 'undefined',
    hasDocument: typeof window !== 'undefined' && typeof window.document !== 'undefined',
    isWeb
  });

  if (isWeb) {
    console.log('[X Complete] 🌐 Web platform detected - using async service to avoid timeouts');

    try {
      // Import async service dynamically using require for better compatibility
      const xAsyncService = require('./xAsyncService');

      // Create abort controller for the async job
      const abortController = new AbortController();

      // Store abort controller for potential cancellation
      // Note: This should be exposed via a hook or context for UI components to access
      (globalThis as any).currentXJobAbortController = abortController;

      const asyncResult = await xAsyncService.processXPostAsync(url, (job: any) => {
        console.log(`[X Complete] Async job progress: ${job.progress}% (${job.status})`);
      }, abortController);

      // Transform async result to XCompleteData format
      const result: XCompleteData = {
        success: true,
        media: {
          type: asyncResult.media.type,
          url: asyncResult.media.video_url || asyncResult.media.images?.[0],
          urls: asyncResult.media.images,
          thumbnail: asyncResult.media.thumbnail_url,
        },
        comments: asyncResult.comments.map((c: any) => ({
          user: c.author || c.user || 'Unknown',
          text: c.text || '',
          likes: c.likes || 0,
          timestamp: c.timestamp,
        })),
        metrics: asyncResult.metrics,
        transcription: asyncResult.transcription,
        vision: asyncResult.vision,
        entities: asyncResult.entities || [],  // ✅ Include extracted entities
        tweet: asyncResult.tweet,
        thumbnail_url: asyncResult.media.thumbnail_url,
      };

      console.log('[X Complete] ✅ Entities included:', result.entities?.length || 0, 'entities');

      // ✅ CACHE: Guardar resultado completo
      setXDataToCache(cacheKey, result);
      console.log('[X Complete] 💾 Cached async result');
      console.log('[X Complete] ========== END fetchXComplete (async) ==========');

      return result;
    } catch (error) {
      console.error('[X Complete] Async service failed:', error);
      throw error;
    }
  }

  // ✅ iOS/Android: Continuar con el método directo original
  console.log('[X Complete] 📱 Mobile platform detected - using direct ExtractorT call');

  try {
    // ✅ Obtener credenciales de Pulse para transcripción
    const pulseConnectionStore = require('../state/pulseConnectionStore');
    const { connectedUser } = pulseConnectionStore.usePulseConnectionStore.getState();

    if (!connectedUser) {
      console.warn('[X Complete] No Pulse user connected - some features may be limited');
    }

    // ✅ UNA SOLA llamada a ExtractorT con transcribe=true
    const requestBody = {
      url,
      transcribe: true, // Esto hará transcripción para videos O análisis de visión para imágenes
      save_to_codex: false, // No guardar en Codex desde aquí
      user_id: connectedUser?.id,
      auth_token: connectedUser ? 'mobile-app-fetch' : undefined,
    };

    console.log('[X Complete] 📤 Calling ExtractorT /enhanced-media/process');
    console.log('[X Complete] Request body:', JSON.stringify(requestBody, null, 2));

    // Crear timeout de 2 minutos para la petición
    const timeoutMs = 120000; // 2 minutos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('[X Complete] ⚠️ Request timeout after', timeoutMs, 'ms');
      controller.abort();
    }, timeoutMs);

    let response;
    try {
      console.log('[X Complete] Fetching from:', `${EXTRACTORT_URL}/enhanced-media/process`);
      const startTime = Date.now();

      response = await fetch(`${EXTRACTORT_URL}/enhanced-media/process`, {
        method: 'POST',
        headers: getCommonHeaders(),
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const elapsed = Date.now() - startTime;
      console.log('[X Complete] ✅ Fetch completed in', elapsed, 'ms');
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('[X Complete] ❌ Fetch error:', error);
      if (error.name === 'AbortError') {
        console.error('[X Complete] Request aborted due to timeout');
        throw new Error('Request timeout - ExtractorT took too long to respond');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let errorMessage = `ExtractorT responded with ${response.status}`;
      try {
        const payload = await response.json();
        errorMessage = payload?.error || errorMessage;
      } catch (_) {
        // ignore JSON parse errors
      }
      console.error('[X Complete] Request failed:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('[X Complete] ✅ Response received from ExtractorT');
    console.log('[X Complete] Response keys:', Object.keys(data));

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch X data');
    }

    // ✅ Parsear respuesta completa de ExtractorT
    const content = data.content || {};
    const mediaFiles = data.media_files || [];

    // Determinar tipo de media
    const hasVideo = mediaFiles.some((f: any) => f.type === 'video');
    const hasImage = mediaFiles.some((f: any) => f.type === 'image');
    const mediaType: XMediaType = hasVideo ? 'video' : hasImage ? 'image' : 'text';

    // Construir objeto de media
    const media: XMedia = {
      type: mediaType,
      url: hasVideo
        ? mediaFiles.find((f: any) => f.type === 'video')?.url
        : hasImage
          ? mediaFiles.find((f: any) => f.type === 'image')?.url
          : undefined,
      urls: hasImage ? mediaFiles.filter((f: any) => f.type === 'image').map((f: any) => f.url) : undefined,
      thumbnail: data.content?.thumbnail_url || data.thumbnail_url,
    };

    // Parsear comentarios
    const comments: XComment[] = (content.parsed_comments || []).map((c: any) => ({
      user: c.user || c.author || 'Unknown',
      text: c.text || c.content || '',
      likes: c.likes || 0,
      timestamp: c.timestamp || c.created_at,
    }));

    // Parsear métricas
    const metrics: XMetrics = {
      likes: content.tweet_metrics?.likes,
      replies: content.tweet_metrics?.replies,
      reposts: content.tweet_metrics?.reposts,
      views: content.tweet_metrics?.views,
    };

    // ✅ Obtener transcripción O análisis de visión (ExtractorT ya lo hizo)
    let transcription: string | undefined;
    let vision: string | undefined;

    if (data.transcription) {
      // Video con audio transcrito
      const transcriptions = data.transcription.transcriptions || [];
      if (transcriptions.length > 0) {
        const firstTranscript = transcriptions[0];
        transcription =
          firstTranscript?.transcription?.transcripcion ||
          firstTranscript?.transcription?.text ||
          firstTranscript?.transcripcion ||
          firstTranscript?.text ||
          (typeof firstTranscript?.transcription === 'string' ? firstTranscript.transcription : undefined);
      }
    }

    if (data.vision_analysis) {
      // Imagen analizada con Vision AI
      vision = data.vision_analysis.description;
    }

    // Construir resultado completo
    const result: XCompleteData = {
      success: true,
      media,
      comments,
      metrics,
      transcription,
      vision,
      tweet: {
        text: content.tweet_text || '',
        author_handle: content.author_handle,
        author_name: content.author_name,
        created_at: content.created_at,
      },
      thumbnail_url: content.thumbnail_url || data.thumbnail_url,
    };

    console.log('[X Complete] ✅ Complete data parsed successfully');
    console.log('[X Complete] Media type:', mediaType);
    console.log('[X Complete] Comments count:', comments.length);
    console.log('[X Complete] Has transcription:', !!transcription);
    console.log('[X Complete] Has vision:', !!vision);

    // ✅ CACHE: Guardar resultado completo
    setXDataToCache(cacheKey, result);
    console.log('[X Complete] 💾 Cached complete result');

    console.log('[X Complete] ========== END fetchXComplete (success) ==========');
    return result;
  } catch (error) {
    console.error('[X Complete] ========== ERROR in fetchXComplete ==========');
    console.error('[X Complete] Error:', error);
    throw error;
  }
}
