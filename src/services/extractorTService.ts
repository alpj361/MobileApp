import { InstagramComment } from '../api/link-processor';
import { extractInstagramPostId } from '../utils/instagram';
import {
  saveInstagramComments,
  loadInstagramComments,
  StoredInstagramComments,
} from '../storage/commentsRepo';
import { getCommonHeaders } from '../config/api';

import { getApiUrl } from '../config/backend';

// Primary: use the public server wrapper (ExtractorW) which handles auth and routing
const EXTRACTOR_WRAPPER_URL = getApiUrl('/api/instagram/comments', 'extractorw');
// Fallback: call ExtractorT directly if wrapper is unavailable (requires valid token)
const EXTRACTOR_T_API_URL = getApiUrl('/api/instagram_comment/', 'extractort');
const API_AUTH_TOKEN = 'extractorw-auth-token';

interface FetchCommentsOptions {
  commentLimit?: number;
  includeReplies?: boolean;
}

interface ApiComment {
  id?: string;
  user?: string;
  username?: string;
  text: string;
  likes?: number;
  replies?: ApiComment[];
  timestamp?: string | number | null;
  is_verified?: boolean;
}

interface ApiResultItem {
  url: string;
  post_id?: string;
  comments?: ApiComment[];
  extracted_count?: number;
  comments_count?: number;
  saved_at?: number;
}

interface ApiResponse {
  status: string;
  results?: ApiResultItem[];
  total_comments_extracted?: number;
}

export interface InstagramCommentsResponse {
  success: boolean;
  comments: InstagramComment[];
  totalCount: number;
  error?: string;
}

function mapApiComment(raw: ApiComment, postId: string, index: number, parentId?: string): InstagramComment {
  const baseAuthor = raw.username?.replace(/^@/, '') || raw.user || 'instagram_user';
  const timestampValue = raw.timestamp
    ? new Date(raw.timestamp).getTime()
    : Date.now();
  const generatedId = raw.id || `${postId}-${parentId ?? 'root'}-${index}-${Math.abs(hashCode(raw.text))}`;

  return {
    id: generatedId,
    author: baseAuthor,
    text: raw.text,
    timestamp: timestampValue,
    likes: raw.likes ?? 0,
    verified: raw.is_verified ?? false,
    replies: raw.replies?.map((reply, replyIndex) =>
      mapApiComment(reply, postId, replyIndex, generatedId)
    ),
    parentId,
  };
}

function isLikelyCaptionPlaceholder(comment: InstagramComment, postLikes?: number, index?: number): boolean {
  const textNormalized = comment.text.trim().toLowerCase();
  const authorNormalized = comment.author.trim().toLowerCase();

  const sameAsAuthor = textNormalized !== '' && textNormalized === authorNormalized;
  const noTimestamp = !comment.timestamp || Number.isNaN(comment.timestamp);
  const noReplies = !comment.replies || comment.replies.length === 0;
  const likesMatchesPost = typeof postLikes === 'number' && postLikes > 0 && comment.likes === postLikes;
  const isFirst = index === 0;

  return sameAsAuthor && noReplies && likesMatchesPost && (noTimestamp || isFirst);
}

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    // eslint-disable-next-line no-bitwise
    hash = (hash << 5) - hash + value.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    hash |= 0;
  }
  return hash;
}

async function fetchCommentsFromApi(url: string, postId: string, options?: FetchCommentsOptions): Promise<StoredInstagramComments> {
  // 1) Try the server wrapper first (no auth required on device)
  try {
    const wrapperRes = await fetch(EXTRACTOR_WRAPPER_URL, {
      method: 'POST',
      headers: getCommonHeaders(),
      body: JSON.stringify({ url, limit: options?.commentLimit ?? 120 }),
    });

    if (wrapperRes.ok) {
      const data: any = await wrapperRes.json();
      const commentsRaw: any[] = Array.isArray(data?.comments)
        ? data.comments
        : Array.isArray(data?.results?.[0]?.comments)
          ? data.results[0].comments
          : [];
      const total =
        data?.total ??
        data?.count ??
        data?.results?.[0]?.comments_count ??
        data?.total_comments_extracted ??
        commentsRaw.length;

      const mapped = commentsRaw
        .map((c, idx) => {
          // Allow both wrapper shape and ExtractorT shape
          const normalized: ApiComment = {
            id: c.id,
            user: c.user || c.author,
            username: c.username || c.author,
            text: c.text,
            likes: c.likes ?? c.like_count,
            replies: c.replies,
            timestamp: c.timestamp ?? c.created_at ?? c.time,
            is_verified: c.verified ?? c.is_verified,
          };
          return mapApiComment(normalized, postId, idx);
        })
        .filter((comment, idx) => !isLikelyCaptionPlaceholder(comment, total, idx));

      const filteredCount = mapped.length;
      const finalTotal = total > 0 ? total : filteredCount;

      return {
        url,
        postId,
        comments: mapped,
        extractedCount: filteredCount,
        totalCount: finalTotal,
        savedAt: Date.now(),
      };
    }
  } catch (e) {
    // Ignore and try direct ExtractorT
  }

  // 2) Fallback to direct ExtractorT
  const body = JSON.stringify({
    urls: [url],
    comment_limit: options?.commentLimit ?? 120,
    include_replies: options?.includeReplies ?? true,
  });

  const response = await fetch(EXTRACTOR_T_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_AUTH_TOKEN}`,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`ExtractorT responded with ${response.status}`);
  }

  const data: ApiResponse = await response.json();
  const firstResult = data.results && data.results[0];

  if (!firstResult) {
    throw new Error('ExtractorT did not return results');
  }

  const apiComments = firstResult.comments ?? [];
  const mappedComments = apiComments.map((comment, idx) => mapApiComment(comment, postId, idx));

  const extractedCount = firstResult.extracted_count ?? mappedComments.length;
  const totalCount = firstResult.comments_count ?? data.total_comments_extracted ?? extractedCount;

  return {
    url,
    postId,
    comments: mappedComments,
    extractedCount,
    totalCount,
    savedAt: Date.now(),
  };
}

export async function extractInstagramComments(url: string): Promise<InstagramCommentsResponse> {
  try {
    const postId = extractInstagramPostId(url);
    if (!postId) {
      throw new Error('No se pudo determinar el ID del post de Instagram');
    }

    const stored = await fetchAndStoreInstagramComments(url, postId);

    return {
      success: true,
      comments: stored.comments,
      totalCount: stored.totalCount ?? stored.extractedCount,
    };
  } catch (error) {
    console.error('Error extracting Instagram comments:', error);
    return {
      success: false,
      comments: [],
      totalCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function fetchAndStoreInstagramComments(
  url: string,
  postId: string,
  options?: FetchCommentsOptions,
): Promise<StoredInstagramComments> {
  const payload = await fetchCommentsFromApi(url, postId, options);
  await saveInstagramComments(payload);
  return payload;
}

export async function loadStoredInstagramComments(postId: string): Promise<StoredInstagramComments | null> {
  return loadInstagramComments(postId);
}

export async function getInstagramCommentsSummary(url: string): Promise<{
  totalComments: number;
  hasComments: boolean;
  topComments: InstagramComment[];
}> {
  try {
    const postId = extractInstagramPostId(url);
    if (!postId) {
      return {
        totalComments: 0,
        hasComments: false,
        topComments: [],
      };
    }

    const stored = await loadInstagramComments(postId);
    if (!stored) {
      return {
        totalComments: 0,
        hasComments: false,
        topComments: [],
      };
    }

    const topComments = stored.comments.slice(0, 3);
    return {
      totalComments: stored.totalCount ?? stored.extractedCount,
      hasComments: stored.comments.length > 0,
      topComments,
    };
  } catch (error) {
    console.error('Error getting Instagram comments summary:', error);
    return {
      totalComments: 0,
      hasComments: false,
      topComments: [],
    };
  }
}
