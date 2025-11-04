import { InstagramComment } from '../api/link-processor';
import { extractXPostId } from '../utils/x';
import {
  loadXComments,
  saveXComments,
  StoredXComments,
} from '../storage/xCommentsRepo';
import { EXTRACTORW_URL, EXTRACTORT_URL, getApiUrl } from '../config/backend';

const X_COMMENTS_ENDPOINT = getApiUrl('/api/x/comments', 'extractorw');
const X_COMMENTS_EXTRACTORT_ENDPOINT = getApiUrl('/api/x_comment/', 'extractort');

export type XComment = InstagramComment;

interface RawXComment {
  id?: string;
  author?: string;
  user?: string;
  username?: string;
  text?: string;
  likes?: number;
  verified?: boolean;
  is_verified?: boolean;
  timestamp?: string | number | null;
  replies?: RawXComment[];
}

interface XCommentsStats {
  likes?: number | string;
  favorites?: number | string;
  retweets?: number | string;
  quotes?: number | string;
  bookmarks?: number | string;
  views?: number | string;
  comments?: number | string;
  replies?: number | string;
}

interface XCommentsMetadata {
  stats?: XCommentsStats | null;
  [key: string]: unknown;
}

interface XCommentsApiResponse {
  success?: boolean;
  comments?: RawXComment[];
  totalCount?: number;
  metadata?: XCommentsMetadata | Record<string, any>;
  error?: { message?: string } | string;
}

export interface FetchXCommentsOptions {
  limit?: number;
  includeReplies?: boolean;
  force?: boolean;
  fallbackCommentCount?: number; // Use this if server fails
}

function resolveTimestamp(value: RawXComment['timestamp']): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

function createId(postId: string, parentId: string | undefined, index: number, text?: string): string {
  const base = `${postId}-${parentId ?? 'root'}-${index}`;
  if (!text) return `${base}-${Math.random().toString(36).slice(2, 8)}`;
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i); // eslint-disable-line no-bitwise
    hash |= 0; // eslint-disable-line no-bitwise
  }
  return `${base}-${Math.abs(hash)}`;
}

function normalizeCount(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.replace(/[,\s]/g, ''), 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function mapRawComment(raw: RawXComment, postId: string, index: number, parentId?: string): XComment {
  const author = raw.author || raw.username || raw.user || 'x_user';
  const id = raw.id || createId(postId, parentId, index, raw.text);
  const replies = Array.isArray(raw.replies)
    ? raw.replies.map((reply, replyIdx) => mapRawComment(reply, postId, replyIdx, id))
    : undefined;

  return {
    id,
    author,
    text: raw.text ?? '',
    timestamp: resolveTimestamp(raw.timestamp),
    likes: raw.likes ?? 0,
    verified: raw.verified ?? raw.is_verified ?? false,
    replies,
    parentId,
  };
}

/**
 * Fallback function to get basic comment count from main ExtractorW endpoint
 */
async function getFallbackCommentCount(url: string): Promise<number | undefined> {
  try {
    // Use ExtractorW as primary source
    console.log('[X] Trying ExtractorW for fallback comment count...');
    const response = await fetch(`${EXTRACTORW_URL}/api/x/media`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer extractorw-auth-token'
      },
      body: JSON.stringify({ url }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        const content = data.content || data;
        const count = parseNumericValue(
          content.engagement?.replies || 
          content.engagement?.comments ||
          content.replies ||
          content.comments
        );
        console.log('[X] ExtractorW fallback comment count:', count);
        return count;
      }
    }
  } catch (error) {
    console.warn('[X] Fallback comment count failed:', error);
  }
  return undefined;
}

function parseNumericValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.replace(/[,\s]/g, ''), 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

/**
 * ✅ OPTIMIZADO: Obtener comentarios usando el servicio unificado
 * Ya NO hace llamadas duplicadas - usa fetchXComplete()
 */
export async function fetchXComments(url: string, options: FetchXCommentsOptions = {}): Promise<StoredXComments> {
  const postId = extractXPostId(url);
  if (!postId) {
    throw new Error('Invalid X URL – post id could not be determined');
  }

  if (!options.force) {
    const cached = await loadXComments(postId);
    if (cached) {
      return cached;
    }
  }

  try {
    // ✅ Usar servicio unificado que obtiene TODO en una llamada
    const xCompleteService = require('./xCompleteService');
    const completeData = await xCompleteService.fetchXComplete(url);
    
    console.log('[X Comments] ✅ Got comments from unified service');
    console.log('[X Comments] Comments count:', completeData.comments.length);
    
    // Convertir comentarios al formato esperado
    const mappedComments = completeData.comments.map((c, index) => ({
      id: createId(postId, undefined, index, c.text),
      author: c.user,
      text: c.text,
      timestamp: c.timestamp ? (typeof c.timestamp === 'string' ? Date.parse(c.timestamp) : c.timestamp) : Date.now(),
      likes: c.likes,
      verified: false,
      replies: undefined,
      parentId: undefined,
    }));
    
    // Convertir a formato StoredXComments
    const stored: StoredXComments = {
      url,
      postId,
      comments: mappedComments,
      extractedCount: mappedComments.length,
      totalCount: mappedComments.length,
      savedAt: Date.now(),
      engagement: {
        likes: completeData.metrics.likes,
        shares: completeData.metrics.reposts,
        views: completeData.metrics.views,
        comments: completeData.metrics.replies,
      },
    };
    
    await saveXComments(stored);
    return stored;
  } catch (error) {
    console.error('[X Comments] Error fetching comments:', error);
    
    // Fallback: intentar obtener conteo básico
    const fallbackCount = await getFallbackCommentCount(url);
    
    return {
      url,
      postId,
      comments: [],
      extractedCount: 0,
      totalCount: fallbackCount || options.fallbackCommentCount || 0,
      savedAt: Date.now(),
      engagement: {
        comments: fallbackCount || options.fallbackCommentCount,
      },
    };
  }
}

// Código legacy mantenido para compatibilidad (no se usa más)
async function fetchXCommentsLegacy(url: string, options: FetchXCommentsOptions = {}): Promise<StoredXComments> {
  const postId = extractXPostId(url);
  if (!postId) {
    throw new Error('Invalid X URL – post id could not be determined');
  }

  const replyLimit = Math.min(Math.max(options.limit ?? 100, 1), 100);

  const response = await fetch(X_COMMENTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      maxComments: replyLimit,
      includeReplies: options.includeReplies ?? true,
    }),
  });

  if (!response.ok) {
    let errorMessage = `X comments endpoint responded with ${response.status}`;
    try {
      const payload = await response.json();
      errorMessage = payload?.error?.message || errorMessage;
    } catch (_) {
      // ignore JSON parse errors
    }
    
    // Para errores 404 (Not Found), 502 (Bad Gateway) y otros errores del servidor, usar fallback
    if (response.status === 404 || response.status >= 500 || response.status === 502) {
      console.warn(`[X] Server error (${response.status}), trying fallback for comment count`);
      
      // Intentar obtener el conteo de comentarios del endpoint principal
      let fallbackCount = await getFallbackCommentCount(url);
      
      // Si el fallback también falla, usar el valor original si está disponible
      if (fallbackCount === undefined && options.fallbackCommentCount !== undefined) {
        console.log('[X] Using original comment count from link data:', options.fallbackCommentCount);
        fallbackCount = options.fallbackCommentCount;
      }
      
      return {
        url,
        postId,
        comments: [],
        extractedCount: 0,
        totalCount: fallbackCount || 0,
        savedAt: Date.now(),
        engagement: {
          comments: fallbackCount,
        },
      };
    }
    
    console.error('[X] Comments request failed:', errorMessage);
    throw new Error(errorMessage);
  }

  const data: XCommentsApiResponse = await response.json();
  const rawComments: RawXComment[] = Array.isArray(data.comments) ? data.comments : [];
  const mapped = rawComments.map((comment, index) => mapRawComment(comment, postId, index));

  const metadata = (data.metadata as XCommentsMetadata) ?? {};
  const stats = metadata?.stats ?? {};

  const likes = normalizeCount(stats.likes ?? stats.favorites);
  const retweets = normalizeCount(stats.retweets);
  const quotes = normalizeCount(stats.quotes);
  const bookmarks = normalizeCount(stats.bookmarks);
  const views = normalizeCount(stats.views);
  const commentsTotal = normalizeCount(stats.comments ?? stats.replies);

  const stored: StoredXComments = {
    url,
    postId,
    comments: mapped,
    extractedCount: mapped.length,
    totalCount: typeof data.totalCount === 'number' ? data.totalCount : mapped.length,
    savedAt: Date.now(),
    engagement: {
      likes,
      shares: retweets,
      quotes,
      bookmarks,
      views,
      comments: commentsTotal ?? (typeof data.totalCount === 'number' ? data.totalCount : mapped.length),
    },
  };

  await saveXComments(stored);
  return stored;
}

export async function loadCachedXComments(postId: string): Promise<StoredXComments | null> {
  return loadXComments(postId);
}
