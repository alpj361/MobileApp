import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExtractedEntity } from '../types/entities';

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

export async function saveXAnalysis(data: StoredXAnalysis): Promise<void> {
  const key = buildKey(data.postId);
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

export async function clearXAnalysis(postId: string): Promise<void> {
  const key = buildKey(postId);
  await AsyncStorage.removeItem(key);
}

