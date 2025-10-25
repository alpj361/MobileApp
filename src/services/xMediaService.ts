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

export async function fetchXMedia(url: string): Promise<XMedia> {
  if (!url) {
    throw new Error('URL is required');
  }

  if (!url.includes('twitter.com') && !url.includes('x.com')) {
    throw new Error('Invalid X URL');
  }

  // Check if this URL is already being fetched
  if (runningMediaFetches.has(url)) {
    console.log('[X Media] URL is already being fetched, waiting...:', url);
    // Wait a bit and retry (simple backoff)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check again after waiting
    if (runningMediaFetches.has(url)) {
      throw new Error('Media fetch already in progress for this URL');
    }
  }

  // Mark as being fetched
  runningMediaFetches.add(url);

  try {
    const response = await fetch(`${BASE_URL}/api/x/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      let errorMessage = `X media endpoint responded with ${response.status}`;
      try {
        const payload = await response.json();
        errorMessage = payload?.error?.message || errorMessage;
      } catch (_) {
        // ignore JSON parse errors
      }
      console.error('[X Media] Request failed:', errorMessage);
      throw new Error(errorMessage);
    }

    const data: XMediaApiResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error?.toString() || 'Failed to fetch X media');
    }

    // Parse response
    const mediaData = data.media || data.content?.media?.[0];
    
    if (!mediaData) {
      // Text-only tweet
      return {
        type: 'text',
      };
    }

    const type: XMediaType = mediaData.type === 'video' ? 'video' : 
                             mediaData.type === 'image' ? 'image' : 'text';

    return {
      type,
      url: mediaData.url,
      urls: mediaData.urls,
      thumbnail: mediaData.thumbnail,
      duration: mediaData.metadata?.duration,
      size: mediaData.metadata?.size,
      width: mediaData.metadata?.width,
      height: mediaData.metadata?.height,
      format: mediaData.metadata?.format,
    };
  } catch (error) {
    console.error('[X Media] Error fetching media:', error);
    throw error;
  } finally {
    // Always remove from running set when done
    runningMediaFetches.delete(url);
  }
}
