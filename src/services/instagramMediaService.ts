import { extractInstagramPostId } from '../utils/instagram';
import { getApiUrl } from '../config/backend';

const INSTAGRAM_MEDIA_ENDPOINT = getApiUrl('/api/instagram/media', 'extractorw');

export type InstagramMediaType = 'video' | 'image' | 'carousel' | 'unknown';

export interface InstagramMedia {
  postId: string;
  type: InstagramMediaType;
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

export async function fetchInstagramMedia(url: string): Promise<InstagramMedia> {
  try {
    const response = await fetch(INSTAGRAM_MEDIA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Media endpoint responded with ${response.status}`);
    }

    const data: RawMediaResponse = await response.json();
    const postId = data.post_id || extractInstagramPostId(url) || '';
    const type = (data.type as InstagramMediaType) || inferMediaType(data);

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
    console.error('Failed to fetch Instagram media:', error);
    throw error;
  }
}

function inferMediaType(data: RawMediaResponse): InstagramMediaType {
  if (data.video_url || data.audio_url) return 'video';
  if (Array.isArray(data.images)) {
    return data.images.length > 1 ? 'carousel' : 'image';
  }
  return 'unknown';
}
