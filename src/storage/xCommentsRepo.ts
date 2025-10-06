import AsyncStorage from '@react-native-async-storage/async-storage';
import { InstagramComment } from '../api/link-processor';

export interface StoredXComments {
  url: string;
  postId: string;
  totalCount?: number;
  extractedCount: number;
  comments: InstagramComment[];
  savedAt: number;
  engagement?: {
    likes?: number;
    shares?: number;
    quotes?: number;
    views?: number;
    bookmarks?: number;
    comments?: number;
  };
}

const STORAGE_PREFIX = 'x-comments:';

const buildKey = (postId: string): string => `${STORAGE_PREFIX}${postId}`;

export async function saveXComments(data: StoredXComments): Promise<void> {
  await AsyncStorage.setItem(buildKey(data.postId), JSON.stringify(data));
}

export async function loadXComments(postId: string): Promise<StoredXComments | null> {
  const raw = await AsyncStorage.getItem(buildKey(postId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredXComments;
  } catch (error) {
    console.warn('[X] Failed to parse stored comments:', error);
    return null;
  }
}

export async function clearXComments(postId: string): Promise<void> {
  await AsyncStorage.removeItem(buildKey(postId));
}

export async function countStoredXComments(postId: string): Promise<number> {
  const stored = await loadXComments(postId);
  return stored?.extractedCount ?? 0;
}
