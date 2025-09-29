import { create, StateCreator } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinkData } from '../api/link-processor';
import { ImprovedLinkData, processImprovedLink } from '../api/improved-link-processor';
import { extractInstagramPostId } from '../utils/instagram';
import { loadInstagramComments, StoredInstagramComments } from '../storage/commentsRepo';
import { fetchAndStoreInstagramComments } from '../services/extractorTService';

export interface SavedItem extends LinkData {
  id: string;
  source: 'chat' | 'clipboard' | 'manual';
  isFavorite?: boolean;
  // Codex relationship
  codex_id?: string; // ID from codex_items table when saved to codex
  // Improved metadata fields
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
  contentScore?: number;
  hasCleanDescription?: boolean;
  imageQuality?: 'high' | 'medium' | 'low' | 'none';
  processingTime?: number;
  lastUpdated?: number;
  commentsInfo?: {
    postId: string;
    totalCount?: number;
    loadedCount: number;
    loading: boolean;
    lastUpdated?: number;
    error?: string | null;
  };
}

interface SavedState {
  items: SavedItem[];
  isLoading: boolean;
  addSavedItem: (linkData: LinkData, source?: SavedItem['source']) => Promise<void>;
  removeSavedItem: (id: string) => void;
  toggleFavorite: (id: string) => void;
  updateSavedItem: (id: string, patch: Partial<SavedItem>) => void;
  reprocessSavedItem: (id: string) => Promise<void>;
  setCodexId: (id: string, codex_id: string) => void;
  getSavedItems: () => SavedItem[];
  getSavedItemsByType: (type: LinkData['type']) => SavedItem[];
  getSavedItemsByQuality: (quality: SavedItem['quality']) => SavedItem[];
  clearSavedItems: () => void;
  setLoading: (loading: boolean) => void;
  getQualityStats: () => { excellent: number; good: number; fair: number; poor: number };
  fetchCommentsForItem: (id: string) => Promise<void>;
}

const runningCommentFetches = new Set<string>();

const createSavedState: StateCreator<SavedState> = (set, get) => {
  const startCommentFetch = async (
    itemId: string,
    url: string,
    postId: string,
    hintedTotal?: number
  ) => {
    if (runningCommentFetches.has(postId)) {
      return;
    }

    runningCommentFetches.add(postId);

    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              commentsInfo: item.commentsInfo
                ? { ...item.commentsInfo, loading: true, error: null }
                : {
                    postId,
                    totalCount: hintedTotal,
                    loadedCount: 0,
                    loading: true,
                    lastUpdated: undefined,
                    error: null,
                  },
            }
          : item,
      ),
    }));

    try {
      const payload = await fetchAndStoreInstagramComments(url, postId, {
        includeReplies: true,
        commentLimit: 120,
      });

      const previewComments = payload.comments.slice(0, 3);

      set((state) => ({
        items: state.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                comments: previewComments,
                commentsLoaded: payload.extractedCount > 0,
                commentsInfo: {
                  postId,
                  totalCount: payload.totalCount ?? hintedTotal ?? payload.extractedCount,
                  loadedCount: payload.extractedCount,
                  loading: false,
                  lastUpdated: payload.savedAt,
                  error: null,
                },
              }
            : item,
        ),
      }));
    } catch (error) {
      set((state) => ({
        items: state.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                commentsInfo: item.commentsInfo
                  ? {
                      ...item.commentsInfo,
                      loading: false,
                      error: error instanceof Error ? error.message : 'No se pudo cargar comentarios',
                    }
                  : undefined,
              }
            : item,
        ),
      }));
    } finally {
      runningCommentFetches.delete(postId);
    }
  };

  return {
    items: [],
    isLoading: false,

    addSavedItem: async (linkData, source = 'manual') => {
      const existingItem = get().items.find((item) => item.url === linkData.url);
      if (existingItem) {
        console.log('Link already saved:', linkData.url);
        return;
      }

      let improvedData: ImprovedLinkData | LinkData = linkData;
      try {
        improvedData = await processImprovedLink(linkData.url);
      } catch (error) {
        console.log('Improved processing failed, using original data:', error);
      }

      const baseData = improvedData as LinkData;
      const postId = extractInstagramPostId(linkData.url);
      let cachedComments: StoredInstagramComments | null = null;

      if (postId) {
        try {
          cachedComments = await loadInstagramComments(postId);
        } catch (error) {
          console.log('Failed to load cached Instagram comments:', error);
        }
      }

      const engagement = baseData.engagement ?? linkData.engagement;
      const totalCount = postId
        ? cachedComments?.totalCount ?? cachedComments?.extractedCount ?? engagement?.comments ?? 0
        : engagement?.comments ?? 0;
      const loadedCount = cachedComments?.extractedCount ?? 0;
      const now = Date.now();
      const shouldRefetch = Boolean(
        postId &&
          (!cachedComments ||
            loadedCount === 0 ||
            (engagement?.comments && loadedCount < engagement.comments) ||
            (cachedComments.savedAt && now - cachedComments.savedAt > 6 * 60 * 60 * 1000))
      );

      const commentsInfo = postId
        ? {
            postId,
            totalCount,
            loadedCount,
            loading: shouldRefetch,
            lastUpdated: cachedComments?.savedAt,
            error: null,
          }
        : undefined;

      const previewComments = cachedComments?.comments?.slice(0, 3) ?? baseData.comments?.slice(0, 3) ?? [];

      const newItem: SavedItem = {
        ...baseData,
        comments: previewComments,
        commentsLoaded: cachedComments ? cachedComments.extractedCount > 0 : baseData.commentsLoaded ?? false,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
        source,
        isFavorite: false,
        commentsInfo,
      };

      set((state) => ({
        items: [newItem, ...state.items],
      }));

      if (postId && shouldRefetch) {
        startCommentFetch(newItem.id, linkData.url, postId, totalCount);
      }
    },

    removeSavedItem: (id) => {
      set((state) => ({
        items: state.items.filter(item => item.id !== id),
      }));
    },

    toggleFavorite: (id) => {
      set((state) => ({
        items: state.items.map(item =>
          item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
        ),
      }));
    },

    updateSavedItem: (id, patch) => {
      set((state) => ({
        items: state.items.map(item => item.id === id ? { ...item, ...patch } : item),
      }));
    },

    reprocessSavedItem: async (id) => {
      const item = get().items.find(i => i.id === id);
      if (!item) return;
      
      try {
        // Use improved processing
        const fresh = await processImprovedLink(item.url);
        
        set((state) => ({
          items: state.items.map(i => 
            i.id === id 
              ? { ...i, 
                  ...fresh,
                  id: i.id, // Keep original ID
                  source: i.source, // Keep original source
                  isFavorite: i.isFavorite, // Keep favorite status
                  lastUpdated: Date.now() } 
              : i),
        }));
      } catch (e) {
        console.error('Reprocessing failed:', e);
        // Keep existing item on error
      }
    },
    
    setCodexId: (id: string, codex_id: string) => {
      set((state) => ({
        items: state.items.map(item => 
          item.id === id 
            ? { ...item, codex_id }
            : item
        ),
      }));
    },
    
    getSavedItems: () => {
      return get().items;
    },
    
    getSavedItemsByType: (type) => {
      return get().items.filter(item => item.type === type);
    },

    getSavedItemsByQuality: (quality) => {
      return get().items.filter(item => item.quality === quality);
    },
    
    clearSavedItems: () => {
      set({ items: [] });
    },
    
    setLoading: (loading) => set({ isLoading: loading }),

    getQualityStats: () => {
      const items = get().items;
      return {
        excellent: items.filter(item => item.quality === 'excellent').length,
        good: items.filter(item => item.quality === 'good').length,
        fair: items.filter(item => item.quality === 'fair').length,
        poor: items.filter(item => item.quality === 'poor' || !item.quality).length,
      };
    },

    fetchCommentsForItem: async (id: string) => {
      const item = get().items.find((saved) => saved.id === id);
      if (!item || !item.commentsInfo?.postId) {
        return;
      }

      startCommentFetch(
        item.id,
        item.url,
        item.commentsInfo.postId,
        item.commentsInfo.totalCount
      );
    },
  };
};

export const useSavedStore = create<SavedState>()(
  persist(createSavedState, {
    name: 'saved-storage',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({ 
      items: state.items,
      // Don't persist loading state
    }),
  })
);
