import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StoredInstagramAnalysis {
  postId: string;
  type: 'video' | 'image' | 'carousel' | 'unknown';
  summary: string;
  transcript?: string;
  images?: Array<{ url: string; description: string }>;
  caption?: string;
  topic?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  createdAt: number;
  metadata?: Record<string, any>;
}

const STORAGE_PREFIX = 'instagram-analysis:';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function buildKey(postId: string): string {
  return `${STORAGE_PREFIX}${postId}`;
}

export async function loadInstagramAnalysis(postId: string): Promise<StoredInstagramAnalysis | null> {
  const key = buildKey(postId);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed: StoredInstagramAnalysis = JSON.parse(raw);
    if (Date.now() - parsed.createdAt > TTL_MS) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to parse stored Instagram analysis:', error);
    return null;
  }
}

export async function saveInstagramAnalysis(data: StoredInstagramAnalysis): Promise<void> {
  const key = buildKey(data.postId);
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

export async function clearInstagramAnalysis(postId: string): Promise<void> {
  const key = buildKey(postId);
  await AsyncStorage.removeItem(key);
}
