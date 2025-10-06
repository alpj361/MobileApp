import { create, StateCreator } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinkData } from '../api/link-processor';
import { ImprovedLinkData, processImprovedLink } from '../api/improved-link-processor';
import { extractInstagramPostId } from '../utils/instagram';
import { extractXPostId } from '../utils/x';
import { loadInstagramComments as loadIgComments, StoredInstagramComments } from '../storage/commentsRepo';
import { fetchAndStoreInstagramComments } from '../services/extractorTService';
import { analyzeInstagramPost as runInstagramAnalysis } from '../services/instagramAnalysisService';
import { loadInstagramAnalysis } from '../storage/instagramAnalysisRepo';
import { loadXComments, StoredXComments } from '../storage/xCommentsRepo';
import { fetchXComments } from '../services/xCommentService';

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
    platform: 'instagram' | 'x';
    postId: string;
    totalCount?: number;
    loadedCount: number;
    loading: boolean;
    lastUpdated?: number;
    error?: string | null;
    refreshing?: boolean;
  };
  analysisInfo?: {
    postId: string;
    type: 'video' | 'image' | 'carousel' | 'unknown';
    summary?: string;
    transcript?: string;
    images?: Array<{ url: string; description: string }>;
    caption?: string;
    topic?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    loading: boolean;
    error?: string | null;
    lastUpdated?: number;
  };
}

interface SavedState {
  items: SavedItem[];
  isLoading: boolean;
  addSavedItem: (linkData: LinkData, source?: SavedItem['source']) => Promise<boolean>;
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
  refreshCommentsCount: (id: string) => Promise<void>;
  analyzeInstagramPost: (id: string) => Promise<void>;
  refreshInstagramAnalysis: (id: string) => Promise<void>;
}

const runningCommentFetches = new Set<string>();

type SocialPlatform = 'instagram' | 'x';

function detectPostPlatform(url: string, hint?: string | null): SocialPlatform | null {
  const normalizedHint = hint?.toLowerCase();
  if (normalizedHint === 'instagram') return 'instagram';
  if (normalizedHint === 'twitter' || normalizedHint === 'x') return 'x';

  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) {
    return 'instagram';
  }
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return 'x';
  }
  return null;
}

const createSavedState: StateCreator<SavedState> = (set, get) => {
  const resolveItemPlatform = (item: SavedItem): SocialPlatform | null => {
    if (item.commentsInfo?.platform) {
      return item.commentsInfo.platform;
    }
    return detectPostPlatform(item.url, item.platform);
  };

  const startCommentFetch = async (
    itemId: string,
    url: string,
    platform: SocialPlatform,
    postId: string,
    hintedTotal?: number,
  ) => {
    const fetchKey = `${platform}:${postId}`;
    if (runningCommentFetches.has(fetchKey)) {
      return;
    }

    runningCommentFetches.add(fetchKey);

    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              commentsInfo: item.commentsInfo
                ? { ...item.commentsInfo, platform, loading: true, error: null }
                : {
                    platform,
                    postId,
                    totalCount: hintedTotal,
                    loadedCount: 0,
                    loading: true,
                    lastUpdated: undefined,
                    error: null,
                    refreshing: false,
                  },
            }
          : item,
      ),
    }));

    try {
      const payload = platform === 'instagram'
        ? await fetchAndStoreInstagramComments(url, postId, {
            includeReplies: true,
            commentLimit: 120,
          })
        : await fetchXComments(url, {
            includeReplies: true,
            limit: 120,
            force: true,
          });

      const previewComments = payload.comments.slice(0, 3);

      set((state) => ({
        items: state.items.map((item) => {
          if (item.id !== itemId) return item;

          const previousTotal = item.commentsInfo?.totalCount && item.commentsInfo.totalCount > 0
            ? item.commentsInfo.totalCount
            : (hintedTotal && hintedTotal > 0 ? hintedTotal : undefined);

          const payloadTotal = payload.totalCount ?? hintedTotal ?? payload.extractedCount;
          const stableTotal = (() => {
            if (previousTotal && payloadTotal) {
              return Math.max(previousTotal, payloadTotal);
            }
            return previousTotal ?? payloadTotal;
          })();

          const nextEngagement = platform === 'x' && (payload as StoredXComments).engagement
            ? {
                ...item.engagement,
                ...(payload as StoredXComments).engagement,
                comments: stableTotal ??
                  (payload as StoredXComments).engagement?.comments ??
                  item.engagement?.comments,
              }
            : item.engagement;

          return {
            ...item,
            comments: previewComments,
            commentsLoaded: payload.extractedCount > 0,
            commentsInfo: {
              platform,
              postId,
              totalCount: stableTotal,
              loadedCount: payload.extractedCount,
              loading: false,
              lastUpdated: payload.savedAt,
              error: null,
              refreshing: false,
            },
            engagement: nextEngagement,
          };
        }),
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
                      refreshing: false,
                    }
                  : item.commentsInfo,
              }
            : item,
        ),
      }));
    } finally {
      runningCommentFetches.delete(fetchKey);
    }
  };

  const refreshCommentCount = async (itemId: string, url: string, platform: SocialPlatform, postId: string) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              commentsInfo: item.commentsInfo
                ? { ...item.commentsInfo, platform, refreshing: true, error: null }
                : {
                    platform,
                    postId,
                    totalCount: undefined,
                    loadedCount: 0,
                    loading: false,
                    lastUpdated: undefined,
                    error: null,
                    refreshing: true,
                  },
            }
          : item,
      ),
    }));

    try {
      if (platform === 'x') {
        const payload = await fetchXComments(url, {
          includeReplies: true,
          limit: 120,
          force: true,
        });

        const total = payload.totalCount ?? payload.extractedCount;

        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  engagement: payload.engagement
                    ? {
                        ...item.engagement,
                        ...payload.engagement,
                        comments: total ?? payload.engagement.comments ?? item.engagement?.comments,
                      }
                    : item.engagement,
                  commentsInfo: item.commentsInfo
                    ? {
                        ...item.commentsInfo,
                        platform,
                        totalCount: total ?? item.commentsInfo.totalCount ?? 0,
                        loadedCount: payload.extractedCount,
                        lastUpdated: Date.now(),
                        refreshing: false,
                        error: null,
                      }
                    : {
                        platform,
                        postId,
                        totalCount: total,
                        loadedCount: payload.extractedCount,
                        loading: false,
                        lastUpdated: Date.now(),
                        error: null,
                        refreshing: false,
                      },
                  comments: payload.comments.slice(0, 3),
                  commentsLoaded: payload.extractedCount > 0,
                }
              : item,
          ),
        }));
        return;
      }

      const refreshed = await processImprovedLink(url);
      const refreshedCount = refreshed.engagement?.comments ?? 0;

      set((state) => ({
        items: state.items.map((item) =>
          item.id === itemId
                ? {
                    ...item,
                    engagement: refreshed.engagement ?? item.engagement,
                    commentsInfo: item.commentsInfo
                      ? {
                          ...item.commentsInfo,
                          platform,
                          totalCount: Math.max(item.commentsInfo.totalCount ?? 0, refreshedCount),
                          lastUpdated: Date.now(),
                          refreshing: false,
                          error: null,
                        }
                      : {
                          platform,
                          postId,
                          totalCount: refreshedCount,
                          loadedCount: 0,
                          loading: false,
                          lastUpdated: Date.now(),
                          error: null,
                          refreshing: false,
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
                      refreshing: false,
                      error: error instanceof Error ? error.message : 'No se pudo actualizar contador',
                    }
                  : item.commentsInfo,
              }
            : item,
        ),
      }));
    }
  };

  const runAnalysisForItem = async (itemId: string, url: string, caption?: string, force = false) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              analysisInfo: item.analysisInfo
                ? { ...item.analysisInfo, loading: true, error: null }
                : {
                    postId: extractInstagramPostId(url) ?? '',
                    type: 'unknown',
                    loading: true,
                    summary: undefined,
                    transcript: undefined,
                    images: undefined,
                    caption,
                    topic: undefined,
                    sentiment: undefined,
                    lastUpdated: undefined,
                    error: null,
                  },
            }
          : item,
      ),
    }));

    try {
      const analysis = await runInstagramAnalysis(url, caption, { force });
      set((state) => ({
        items: state.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                analysisInfo: {
                  postId: analysis.postId,
                  type: analysis.type,
                  summary: analysis.summary,
                  transcript: analysis.transcript,
                  images: analysis.images,
                  caption: analysis.caption,
                  topic: analysis.topic,
                  sentiment: analysis.sentiment,
                  loading: false,
                  error: null,
                  lastUpdated: analysis.createdAt,
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
                analysisInfo: item.analysisInfo
                  ? {
                      ...item.analysisInfo,
                      loading: false,
                      error: error instanceof Error ? error.message : 'No se pudo analizar el post',
                    }
                  : {
                      postId: extractInstagramPostId(url) ?? '',
                      type: 'unknown',
                      summary: undefined,
                      transcript: undefined,
                      images: undefined,
                      caption,
                      topic: undefined,
                      sentiment: undefined,
                      loading: false,
                      error: error instanceof Error ? error.message : 'No se pudo analizar el post',
                      lastUpdated: undefined,
                    },
              }
            : item,
        ),
      }));
    }
  };

  return {
    items: [],
    isLoading: false,

    addSavedItem: async (linkData, source = 'manual') => {
      const existingItem = get().items.find((item) => item.url === linkData.url);
      if (existingItem) {
        console.log('Link already saved:', linkData.url);
        return false;
      }

      let improvedData: ImprovedLinkData | LinkData = linkData;
      try {
        improvedData = await processImprovedLink(linkData.url);
      } catch (error) {
        console.log('Improved processing failed, using original data:', error);
      }

      const baseData = improvedData as LinkData;
      const platform = detectPostPlatform(linkData.url, baseData.platform);
      let postId = '';
      let cachedComments: StoredInstagramComments | StoredXComments | null = null;
      let cachedAnalysis = null;

      if (platform === 'instagram') {
        postId = extractInstagramPostId(linkData.url) ?? '';
        if (postId) {
          try {
            cachedComments = await loadIgComments(postId);
          } catch (error) {
            console.log('Failed to load cached Instagram comments:', error);
          }

          try {
            cachedAnalysis = await loadInstagramAnalysis(postId);
          } catch (error) {
            console.log('Failed to load cached Instagram analysis:', error);
          }
        }
      } else if (platform === 'x') {
        postId = extractXPostId(linkData.url) ?? '';
        if (postId) {
          try {
            cachedComments = await loadXComments(postId);
          } catch (error) {
            console.log('Failed to load cached X comments:', error);
          }
        }
      }

      const candidateEngagement: SavedItem['engagement'] = {
        ...linkData.engagement,
        ...baseData.engagement,
      };
      if (cachedComments && 'engagement' in cachedComments && cachedComments.engagement) {
        Object.assign(candidateEngagement, cachedComments.engagement);
      }
      const engagementComments = candidateEngagement?.comments;
      if (typeof engagementComments !== 'number' && typeof cachedComments?.totalCount === 'number') {
        candidateEngagement.comments = cachedComments.totalCount;
      }
      const hasEngagement = Object.values(candidateEngagement ?? {}).some((value) => typeof value === 'number' && !Number.isNaN(value));
      const engagement = hasEngagement ? candidateEngagement : undefined;
      const cachedTotal = cachedComments?.totalCount ?? cachedComments?.extractedCount;
      const totalCount = postId
        ? (engagementComments ?? cachedTotal)
        : engagementComments;
      const loadedCount = cachedComments?.extractedCount ?? 0;
      const now = Date.now();
      const shouldRefetch = Boolean(
        postId && platform &&
          (!cachedComments ||
            loadedCount === 0 ||
            (engagement?.comments && loadedCount < engagement.comments) ||
            (cachedComments.savedAt && now - cachedComments.savedAt > 6 * 60 * 60 * 1000))
      );

      const commentsInfo = postId && platform
        ? {
            platform,
            postId,
            totalCount,
            loadedCount,
            loading: shouldRefetch,
            lastUpdated: cachedComments?.savedAt,
            error: null,
            refreshing: false,
          }
        : undefined;

      const previewComments = cachedComments?.comments?.slice(0, 3) ?? baseData.comments?.slice(0, 3) ?? [];

      const newItem: SavedItem = {
        ...baseData,
        engagement,
        comments: previewComments,
        commentsLoaded: cachedComments ? cachedComments.extractedCount > 0 : baseData.commentsLoaded ?? false,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
        source,
        isFavorite: false,
        commentsInfo,
        analysisInfo: cachedAnalysis
          ? {
              postId: cachedAnalysis.postId,
              type: cachedAnalysis.type,
              summary: cachedAnalysis.summary,
              transcript: cachedAnalysis.transcript,
              images: cachedAnalysis.images,
              caption: cachedAnalysis.caption,
              topic: cachedAnalysis.topic,
              sentiment: cachedAnalysis.sentiment,
              loading: false,
              error: null,
              lastUpdated: cachedAnalysis.createdAt,
            }
          : undefined,
      };

      set((state) => ({
        items: [newItem, ...state.items],
      }));

      if (postId && platform && shouldRefetch) {
        startCommentFetch(newItem.id, linkData.url, platform, postId, totalCount);
      }
      return true;
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
      if (!item) {
        return;
      }

      const platform = resolveItemPlatform(item);
      const postId = item.commentsInfo?.postId ?? (platform === 'instagram'
        ? extractInstagramPostId(item.url) ?? ''
        : platform === 'x'
          ? extractXPostId(item.url) ?? ''
          : '');

      if (!platform || !postId) {
        return;
      }

      startCommentFetch(
        item.id,
        item.url,
        platform,
        postId,
        item.commentsInfo?.totalCount
      );
    },
    refreshCommentsCount: async (id: string) => {
      const item = get().items.find((saved) => saved.id === id);
      if (!item) {
        return;
      }

      const platform = resolveItemPlatform(item);
      const postId = item.commentsInfo?.postId ?? (platform === 'instagram'
        ? extractInstagramPostId(item.url) ?? ''
        : platform === 'x'
          ? extractXPostId(item.url) ?? ''
          : '');

      if (!platform || !postId) return;

      await refreshCommentCount(item.id, item.url, platform, postId);
    },
    analyzeInstagramPost: async (id: string) => {
      const item = get().items.find((saved) => saved.id === id);
      if (!item) {
        return;
      }

      await runAnalysisForItem(item.id, item.url, item.description);
    },
    refreshInstagramAnalysis: async (id: string) => {
      const item = get().items.find((saved) => saved.id === id);
      if (!item) {
        return;
      }

      await runAnalysisForItem(item.id, item.url, item.description, true);
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
