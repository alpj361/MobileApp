import AsyncStorage from '@react-native-async-storage/async-storage';
import { InstagramComment } from '../api/link-processor';

export interface StoredInstagramComments {
  url: string;
  postId: string;
  totalCount?: number;
  extractedCount: number;
  comments: InstagramComment[];
  savedAt: number;
}

const STORAGE_PREFIX = 'instagram-comments:';

function buildKey(postId: string): string {
  return `${STORAGE_PREFIX}${postId}`;
}

export async function saveInstagramComments(data: StoredInstagramComments): Promise<void> {
  const key = buildKey(data.postId);
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

export async function loadInstagramComments(postId: string): Promise<StoredInstagramComments | null> {
  const key = buildKey(postId);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed: StoredInstagramComments = JSON.parse(raw);
    return parsed;
  } catch (error) {
    console.warn('Failed to parse stored Instagram comments:', error);
    return null;
  }
}

export async function getInstagramCommentsCount(postId: string): Promise<number> {
  const stored = await loadInstagramComments(postId);
  return stored?.extractedCount ?? 0;
}

export async function clearInstagramComments(postId: string): Promise<void> {
  const key = buildKey(postId);
  await AsyncStorage.removeItem(key);
}
