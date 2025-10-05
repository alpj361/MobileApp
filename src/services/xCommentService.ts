import { InstagramComment } from '../api/link-processor';
import { extractXPostId } from '../utils/x';
import {
  loadXComments,
  saveXComments,
  StoredXComments,
} from '../storage/xCommentsRepo';

const BASE_URL = process.env.EXPO_PUBLIC_EXTRACTORW_URL ?? 'https://server.standatpd.com';
const X_COMMENTS_ENDPOINT = `${BASE_URL.replace(/\/$/, '')}/api/x/comments`;

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

interface XCommentsApiResponse {
  success?: boolean;
  comments?: RawXComment[];
  totalCount?: number;
  metadata?: Record<string, any>;
  error?: { message?: string } | string;
}

export interface FetchXCommentsOptions {
  limit?: number;
  includeReplies?: boolean;
  force?: boolean;
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

  const response = await fetch(X_COMMENTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      maxComments: options.limit ?? 120,
      includeReplies: options.includeReplies ?? true,
    }),
  });

  if (!response.ok) {
    const message = `X comments endpoint responded with ${response.status}`;
    console.error('[X] Comments request failed:', message);
    throw new Error(message);
  }

  const data: XCommentsApiResponse = await response.json();
  const rawComments: RawXComment[] = Array.isArray(data.comments) ? data.comments : [];
  const mapped = rawComments.map((comment, index) => mapRawComment(comment, postId, index));

  const stored: StoredXComments = {
    url,
    postId,
    comments: mapped,
    extractedCount: mapped.length,
    totalCount: typeof data.totalCount === 'number' ? data.totalCount : mapped.length,
    savedAt: Date.now(),
  };

  await saveXComments(stored);
  return stored;
}

export async function loadCachedXComments(postId: string): Promise<StoredXComments | null> {
  return loadXComments(postId);
}

