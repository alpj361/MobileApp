import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExtractedEntity } from '../types/entities';
import { supabase, supabaseAvailable } from '../config/supabase';
import { guestSessionManager } from '../services/guestSessionManager';
import { extractXPostId } from '../utils/x';

export interface StoredXAnalysis {
  postId: string;
  type: 'video' | 'image' | 'text';
  summary?: string;
  transcript?: string;
  images?: Array<{ url: string; description: string }>;
  text: string; // Tweet original text
  topic?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  entities?: ExtractedEntity[];  // ✅ Extracted entities
  createdAt: number;
  metadata?: {
    processingTime?: number;
    videoSize?: number;
    imageCount?: number;
    [key: string]: any;
  };
}

const STORAGE_PREFIX = 'x-analysis:';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function buildKey(postId: string): string {
  return `${STORAGE_PREFIX}${postId}`;
}

// Legacy function for postId - maintained for backward compatibility
export async function loadXAnalysis(postId: string): Promise<StoredXAnalysis | null> {
  const key = buildKey(postId);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed: StoredXAnalysis = JSON.parse(raw);
    if (Date.now() - parsed.createdAt > TTL_MS) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to parse stored X analysis:', error);
    return null;
  }
}

// New function that queries Supabase first, then falls back to AsyncStorage
export async function loadXAnalysisFromUrl(url: string): Promise<StoredXAnalysis | null> {
  console.log('[xAnalysisRepo] 🔍 Loading analysis for URL:', url);

  try {
    // 1. Try to get from Supabase first (if available)
    if (supabaseAvailable()) {
      const supabaseResult = await loadFromSupabase(url);
      if (supabaseResult) {
        console.log('[xAnalysisRepo] ✅ Found completed analysis in Supabase');
        return supabaseResult;
      }
    }

    // 2. Fallback to AsyncStorage
    const postId = extractXPostId(url);
    if (postId) {
      console.log('[xAnalysisRepo] 🔄 Trying AsyncStorage fallback for postId:', postId);
      const asyncStorageResult = await loadXAnalysis(postId);
      if (asyncStorageResult) {
        console.log('[xAnalysisRepo] ✅ Found analysis in AsyncStorage');
        return asyncStorageResult;
      }
    }

    console.log('[xAnalysisRepo] ❌ No analysis found in Supabase or AsyncStorage');
    return null;

  } catch (error) {
    console.warn('[xAnalysisRepo] ⚠️ Error loading analysis:', error);
    return null;
  }
}

export async function saveXAnalysis(data: StoredXAnalysis): Promise<void> {
  const key = buildKey(data.postId);
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

export async function clearXAnalysis(postId: string): Promise<void> {
  const key = buildKey(postId);
  await AsyncStorage.removeItem(key);
}

// Load analysis from Supabase using guest_id/user_id
async function loadFromSupabase(url: string): Promise<StoredXAnalysis | null> {
  try {
    const session = await guestSessionManager.getSessionIdentifier();

    // Build query based on session type
    let query = supabase
      .from('async_jobs')
      .select('result, created_at, metadata')
      .eq('url', url)
      .eq('status', 'completed')
      .not('result', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    // Add session filter
    if (session.type === 'guest' && session.guestId) {
      query = query.eq('guest_id', session.guestId);
    } else if (session.type === 'authenticated' && session.userId) {
      query = query.eq('user_id', session.userId);
    } else {
      console.warn('[xAnalysisRepo] No valid session identifier');
      return null;
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - this is expected
        console.log('[xAnalysisRepo] 📭 No completed job found in Supabase for this URL');
        return null;
      }
      throw error;
    }

    if (!data?.result) {
      console.log('[xAnalysisRepo] 📭 Job found but no result data');
      return null;
    }

    // Transform Supabase result to StoredXAnalysis format
    return transformSupabaseToStoredAnalysis(data.result, url, new Date(data.created_at).getTime());

  } catch (error) {
    console.warn('[xAnalysisRepo] ⚠️ Error loading from Supabase:', error);
    return null;
  }
}

// Transform Supabase async_jobs.result to StoredXAnalysis format
function transformSupabaseToStoredAnalysis(
  supabaseResult: any,
  url: string,
  createdAt: number
): StoredXAnalysis {
  const postId = extractXPostId(url);

  console.log('[xAnalysisRepo] 🔄 Transforming Supabase result:', {
    hasMedia: !!supabaseResult.media,
    mediaType: supabaseResult.media?.type,
    hasTweet: !!supabaseResult.tweet,
    entitiesCount: supabaseResult.entities?.length || 0
  });

  // Extract data from the Supabase result structure
  const tweet = supabaseResult.tweet || {};
  const media = supabaseResult.media || {};
  const entities = supabaseResult.entities || [];

  // Determine type based on media content
  let type: 'video' | 'image' | 'text' = 'text';
  if (media.type === 'video') {
    type = 'video';
  } else if (media.type === 'image' || (media.urls && media.urls.length > 0)) {
    type = 'image';
  }

  // For videos, use thumbnail as image; for images, use media URLs
  let images: Array<{ url: string; description: string }> | undefined;

  if (type === 'video' && media.thumbnail) {
    // For videos, show thumbnail as the image
    images = [{
      url: media.thumbnail,
      description: `Video thumbnail from ${tweet.author_name || 'X post'}`
    }];
  } else if (type === 'image' && media.urls) {
    // For images, use the media URLs
    images = media.urls.map((img: string) => ({
      url: img,
      description: `Image from ${tweet.author_name || 'X post'}`
    }));
  }

  // Extract text content
  const text = tweet.text || media.tweet_text || '';

  // Get transcript if available (from video processing)
  const transcript = supabaseResult.transcription || media.transcription || undefined;

  // Basic sentiment analysis from text
  const sentiment = inferSentimentFromText(text);

  console.log('[xAnalysisRepo] 📊 Transformation result:', {
    type,
    hasImages: !!images && images.length > 0,
    hasTranscript: !!transcript,
    textLength: text.length,
    entitiesCount: entities.length
  });

  return {
    postId,
    type,
    text,
    sentiment,
    transcript, // ✅ Include transcript if available
    entities: entities.map((e: any) => ({
      type: e.type,
      value: e.value,
      confidence: e.confidence || 0.95,
      context: e.context,
      metadata: e.metadata || {}
    })),
    images,
    createdAt,
    metadata: {
      videoUrl: media.url || media.video_url, // Use the actual video URL if available
      author: tweet.author_name,
      authorHandle: tweet.author_handle,
      metrics: supabaseResult.metrics || media.tweet_metrics,
      commentsCount: supabaseResult.comments?.length || media.comments_count || 0,
      supabaseSource: true,
      originalMediaType: media.type,
      thumbnailUrl: media.thumbnail
    }
  };
}

// Simple sentiment inference from text
function inferSentimentFromText(text: string): 'positive' | 'negative' | 'neutral' {
  if (!text) return 'neutral';

  const lowerText = text.toLowerCase();
  const positiveWords = ['excelente', 'bueno', 'genial', 'fantástico', 'perfecto', 'increíble', 'maravilloso'];
  const negativeWords = ['malo', 'terrible', 'horrible', 'detestable', 'corrupto', 'fracaso', 'problema'];

  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

