import { InstagramComment } from '../api/link-processor';
import { extractXPostId } from '../utils/x';
import {
  loadXComments,
  saveXComments,
  StoredXComments,
} from '../storage/xCommentsRepo';

const EXTRACTORW_URL = process.env.EXPO_PUBLIC_EXTRACTORW_URL ?? 'https://server.standatpd.com';
const EXTRACTORT_URL = 'https://api.standatpd.com';
const X_COMMENTS_ENDPOINT = `${EXTRACTORW_URL.replace(/\/$/, '')}/api/x/comments`;
const X_COMMENTS_EXTRACTORT_ENDPOINT = `${EXTRACTORT_URL}/api/x_comment/`;

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
    
    // Para errores 502 (Bad Gateway) y otros errores del servidor, usar fallback
    if (response.status >= 500 || response.status === 502) {
      console.warn('[X] Server error (502/Bad Gateway), trying fallback for comment count');
      
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
