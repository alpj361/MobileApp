import { extractXPostId } from '../utils/x';

const BASE_URL = process.env.EXPO_PUBLIC_EXTRACTORW_URL ?? 'https://server.standatpd.com';
const X_MEDIA_ENDPOINT = `${BASE_URL.replace(/\/$/, '')}/api/x/media`;

export type XMediaType = 'video' | 'image' | 'carousel' | 'unknown';

export interface XMedia {
  postId: string;
  type: XMediaType;
  videoUrl?: string;
  audioUrl?: string;
  images?: string[];
  thumbnail?: string;
  duration?: number;
  caption?: string;
}

interface RawMediaResponse {
  type?: string;
  post_id?: string;
  video_url?: string;
  audio_url?: string;
  images?: string[];
  thumbnail_url?: string;
  duration?: number;
  caption?: string;
  success?: boolean;
}

export async function fetchXMedia(url: string): Promise<XMedia> {
  try {
    const response = await fetch(X_MEDIA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`X media endpoint responded with ${response.status}`);
    }

    const data: RawMediaResponse = await response.json();
    const postId = data.post_id || extractXPostId(url) || '';
    const type = (data.type as XMediaType) || inferMediaType(data);

    return {
      postId,
      type,
      videoUrl: data.video_url ?? undefined,
      audioUrl: data.audio_url ?? undefined,
      images: Array.isArray(data.images) ? data.images : undefined,
      thumbnail: data.thumbnail_url ?? undefined,
      duration: data.duration,
      caption: data.caption,
    };
  } catch (error) {
    console.error('[X] Failed to fetch media:', error);
    throw error;
  }
}

function inferMediaType(data: RawMediaResponse): XMediaType {
  if (data.video_url || data.audio_url) return 'video';
  if (Array.isArray(data.images)) {
    return data.images.length > 1 ? 'carousel' : 'image';
  }
  return 'unknown';
}

