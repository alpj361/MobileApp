import { create, StateCreator } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { asyncStorageAdapter } from '../storage/platform-storage';
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
import { analyzeXPost as runXAnalysis } from '../services/xAnalysisService';
import { loadXAnalysis, loadXAnalysisFromUrl } from '../storage/xAnalysisRepo';
import { ExtractedEntity } from '../types/entities';
import { getXDataFromCache } from '../storage/xDataCache';

export interface SavedItem extends LinkData {
  id: string;
  source: 'chat' | 'clipboard' | 'manual';
  isFavorite?: boolean;
  isPending?: boolean; // Item is being processed
  // Outer error indicator for initial insertion failures
  outerErrorMessage?: string;
  // Codex relationship
  codex_id?: string; // ID from codex_items table when saved to codex
  // ✨ NUEVO: Categorización para nueva estructura de Codex
  codex_category?: 'general' | 'monitoring' | 'wiki';
  codex_subcategory?: string;
  codex_metadata?: Record<string, any>;
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
    entities?: ExtractedEntity[];  // ✅ Extracted entities
    loading: boolean;
    error?: string | null;
    lastUpdated?: number;
  };
  xAnalysisInfo?: {
    postId: string;
    type: 'video' | 'image' | 'text';
    summary?: string;
    transcript?: string;
    images?: Array<{ url: string; description: string }>;
    text?: string;
    topic?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    entities?: ExtractedEntity[];  // ✅ Extracted entities
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
  analyzeXPost: (id: string) => Promise<void>;
  refreshXAnalysis: (id: string) => Promise<void>;
}

const runningCommentFetches = new Set<string>();
const runningItemProcessing = new Set<string>(); // Track items being processed to prevent duplicates

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
            fallbackCommentCount: hintedTotal,
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
            ? (() => {
                const base = { ...item.engagement };
                const payloadEng = (payload as StoredXComments).engagement;
                
                // Solo actualizar si el nuevo valor es > 0 Y mayor que el actual
                Object.keys(payloadEng).forEach(key => {
                  const newVal = payloadEng[key];
                  const oldVal = base[key] || 0;
                  if (newVal > 0 && newVal > oldVal) {
                    base[key] = newVal;
                  }
                });
                
                return {
                  ...base,
                  comments: stableTotal ??
                    payloadEng?.comments ??
                    item.engagement?.comments,
                };
              })()
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
                  engagement: {
                    ...item.engagement,
                    comments: total ?? payload.engagement?.comments ?? item.engagement?.comments,
                  },
                  commentsInfo: item.commentsInfo
                    ? {
                        ...item.commentsInfo,
                        platform,
                        totalCount: total ?? item.commentsInfo.totalCount ?? 0,
                        loadedCount: payload.extractedCount,
                        lastUpdated: Date.now(),
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

  const runXAnalysisForItem = async (itemId: string, url: string, text?: string, force = false) => {
    const postId = extractXPostId(url);
    if (!postId) {
      console.error('[SavedStore] Cannot extract post ID from URL:', url);
      return;
    }

    // ✅ ALWAYS check cache first, regardless of force flag
    console.log('[SavedStore] Checking cache for completed data (force=' + force + ')');

    // Step 1: Check in-memory cache (xDataCache) first - this is where completed jobs are stored
    const cacheKey = `complete:${url}`;
    const cachedComplete = getXDataFromCache(cacheKey);
    if (cachedComplete) {
      console.log('[SavedStore] ✅ Found completed job data in xDataCache - updating UI immediately');
      console.log('[SavedStore] 🔍 Cache data structure:', {
        hasVision: !!cachedComplete.vision,
        hasTranscription: !!cachedComplete.transcription,
        hasTranscript: !!cachedComplete.transcript,
        mediaType: cachedComplete.media?.type,
        hasThumbnail: !!cachedComplete.media?.thumbnail,
        hasMediaUrls: !!cachedComplete.media?.urls,
        entitiesCount: cachedComplete.entities?.length || 0,
      });

      // Extract transcript from various possible locations
      const transcript = cachedComplete.transcript ||
                        cachedComplete.transcription ||
                        cachedComplete.media?.transcript ||
                        cachedComplete.media?.transcription ||
                        undefined;

      // Extract summary from various possible locations, or generate basic one
      let summary = cachedComplete.vision ||
                    cachedComplete.summary ||
                    cachedComplete.description ||
                    undefined;

      // Generate basic summary if none exists
      if (!summary && (cachedComplete.tweet?.text || cachedComplete.entities?.length)) {
        const tweetText = cachedComplete.tweet?.text || '';
        const entityCount = cachedComplete.entities?.length || 0;
        const mediaType = cachedComplete.media?.type || 'contenido';
        summary = `Post de ${cachedComplete.tweet?.author_name || 'X'} con ${mediaType}${entityCount > 0 ? ` que menciona ${entityCount} entidad(es)` : ''}. ${tweetText.substring(0, 150)}${tweetText.length > 150 ? '...' : ''}`;
      }

      // For videos, use thumbnail; for images, use urls array
      let images: Array<{ url: string; description: string }> | undefined;
      if (cachedComplete.media?.type === 'video' && cachedComplete.media.thumbnail) {
        images = [{
          url: cachedComplete.media.thumbnail,
          description: `Video thumbnail de ${cachedComplete.tweet?.author_name || 'X post'}`
        }];
      } else if (cachedComplete.media?.urls && cachedComplete.media.urls.length > 0) {
        images = cachedComplete.media.urls.map((url: string, idx: number) => ({
          url,
          description: `Imagen ${idx + 1} del post`
        }));
      }

      set((state) => ({
        items: state.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                xAnalysisInfo: {
                  postId: postId,
                  type: cachedComplete.media?.type === 'video' ? 'video' : cachedComplete.media?.type === 'image' ? 'image' : 'text',
                  summary,
                  transcript,
                  images,
                  text: cachedComplete.tweet?.text || text,
                  topic: undefined,
                  sentiment: 'neutral',  // TODO: Implement sentiment analysis
                  entities: cachedComplete.entities || [],
                  loading: false, // ✅ CRITICAL: Set loading to false
                  error: null,
                  lastUpdated: Date.now(),
                },
              }
            : item,
        ),
      }));
      console.log('[SavedStore] ✅ UI updated with cached data, loading=false');
      return; // ✅ Exit early - data found in cache
    }
    console.log('[SavedStore] No completed job data in xDataCache');

    // Step 2: Check Supabase first, then database cache (x_analyses table)
    const cachedAnalysis = await loadXAnalysisFromUrl(url);
    if (cachedAnalysis) {
      console.log('[SavedStore] ✅ Found cached analysis in database - updating UI immediately');
      set((state) => ({
        items: state.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                xAnalysisInfo: {
                  postId: cachedAnalysis.postId,
                  type: cachedAnalysis.type,
                  summary: cachedAnalysis.summary,
                  transcript: cachedAnalysis.transcript,
                  images: cachedAnalysis.images,
                  text: cachedAnalysis.text,
                  topic: cachedAnalysis.topic,
                  sentiment: cachedAnalysis.sentiment,
                  entities: cachedAnalysis.entities || [],
                  loading: false, // ✅ CRITICAL: Set loading to false
                  error: null,
                  lastUpdated: cachedAnalysis.createdAt,
                },
              }
            : item,
        ),
      }));
      console.log('[SavedStore] ✅ UI updated with database cache, loading=false');
      return; // ✅ Exit early - data found in database
    }
    console.log('[SavedStore] No cached analysis found in database');

    // If force=true and no cache found, proceed with re-processing
    if (!force) {
      console.log('[SavedStore] Not forcing re-process and no cache found - will start new analysis');
    }

    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              xAnalysisInfo: item.xAnalysisInfo
                ? { ...item.xAnalysisInfo, loading: true, error: null }
                : {
                    postId: postId,
                    type: 'text',
                    loading: true,
                    summary: undefined,
                    transcript: undefined,
                    images: undefined,
                    text,
                    topic: undefined,
                    sentiment: 'neutral',
                    lastUpdated: undefined,
                    error: null,
                  },
            }
          : item,
      ),
    }));

    try {
      const analysis = await runXAnalysis(url, text, { force });
      set((state) => ({
        items: state.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                xAnalysisInfo: {
                  postId: analysis.postId,
                  type: analysis.type,
                  summary: analysis.summary,
                  transcript: analysis.transcript,
                  images: analysis.images,
                  text: analysis.text,
                  topic: analysis.topic,
                  sentiment: analysis.sentiment,
                  entities: analysis.entities || [],  // ✅ Include entities
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
                xAnalysisInfo: item.xAnalysisInfo
                  ? {
                      ...item.xAnalysisInfo,
                      loading: false,
                      error: error instanceof Error ? error.message : 'No se pudo analizar el post de X',
                    }
                  : {
                      postId: extractXPostId(url) ?? '',
                      type: 'text',
                      summary: undefined,
                      transcript: undefined,
                      images: undefined,
                      text,
                      topic: undefined,
                      sentiment: 'neutral',
                      loading: false,
                      error: error instanceof Error ? error.message : 'No se pudo analizar el post de X',
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
      // Check if already saved
      const existingItem = get().items.find((item) => item.url === linkData.url);
      if (existingItem) {
        console.log('[SavedStore] Link already saved:', linkData.url);
        return false;
      }

      // Check if currently being processed to prevent duplicates
      if (runningItemProcessing.has(linkData.url)) {
        console.log('[SavedStore] Link is already being processed:', linkData.url);
        return false;
      }

      // Mark as being processed
      runningItemProcessing.add(linkData.url);

      // Create a pending placeholder item to show loading state
      const pendingId = `pending-${Date.now()}-${Math.random()}`;
      const pendingItem: SavedItem = {
        id: pendingId,
        url: linkData.url,
        title: 'Procesando...',
        description: '',
        domain: new URL(linkData.url).hostname.replace('www.', ''),
        type: 'article',
        platform: null,
        imageData: { url: '', quality: 'none' },
        engagement: { likes: 0, comments: 0, shares: 0, views: 0 },
        source,
        isPending: true, // Mark as pending
        timestamp: Date.now(),
      };

      // Add pending item immediately for instant UI feedback
      set((state) => ({
        items: [pendingItem, ...state.items],
      }));

      let improvedData: ImprovedLinkData | LinkData = linkData;
      try {
        improvedData = await processImprovedLink(linkData.url);
      } catch (error) {
        console.log('[SavedStore] Improved processing failed, using original data:', error);
        // ✅ NO eliminamos el item - lo guardamos con datos básicos
        // Actualizar item pending con datos básicos de la URL
        const detectedPlatform = detectPostPlatform(linkData.url, null);
        const basicItem: SavedItem = {
          ...pendingItem,
          title: linkData.url,
          description: `Contenido de ${linkData.url}`,
          isPending: false,
          platform: detectedPlatform,
          // Mostrar un modal de error cuando falle la inserción para X/Twitter
          ...(detectedPlatform === 'x'
            ? { outerErrorMessage: 'There is an error processing this X post.' }
            : {}),
        };

        set((state) => ({
          items: state.items.map((item) =>
            item.id === pendingId ? basicItem : item
          ),
        }));

        // Remove from processing set
        runningItemProcessing.delete(linkData.url);
        return true; // ✅ Return true porque sí guardamos el item
      } finally {
        // Always remove from processing set when done
        runningItemProcessing.delete(linkData.url);
      }

      const baseData = improvedData as LinkData;
      const platform = detectPostPlatform(linkData.url, baseData.platform);
      let postId = '';
      let cachedComments: StoredInstagramComments | StoredXComments | null = null;
      let cachedAnalysis = null;
      let cachedXAnalysis = null;

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

          try {
            // Try new Supabase-first approach, fallback to old postId method
            cachedXAnalysis = await loadXAnalysisFromUrl(linkData.url) || await loadXAnalysis(postId);
          } catch (error) {
            console.log('Failed to load cached X analysis:', error);
          }
        }
      }

      // Construir engagement de forma segura sin sobrescribir con undefined
      const candidateEngagement: SavedItem['engagement'] = {
        ...(linkData.engagement || {}),
        ...(baseData.engagement || {}),
      };
      console.log('[DEBUG] linkData.engagement:', linkData.engagement);
      console.log('[DEBUG] baseData.engagement:', baseData.engagement);
      console.log('[DEBUG] candidateEngagement AFTER merge:', candidateEngagement);
      console.log('[DEBUG] cachedComments?.engagement:', cachedComments?.engagement);
      
      // BLOQUEAR: No permitir que cachedComments sobrescriba métricas válidas
      if (cachedComments && 'engagement' in cachedComments && cachedComments.engagement) {
        console.log('[DEBUG] cachedComments.engagement detected:', cachedComments.engagement);
        
        // Verificar si cachedComments tiene métricas válidas (no todas en 0)
        const cachedHasValidMetrics = Object.values(cachedComments.engagement).some(v => typeof v === 'number' && v > 0);
        const currentHasValidMetrics = Object.values(candidateEngagement).some(v => typeof v === 'number' && v > 0);
        
        if (cachedHasValidMetrics && !currentHasValidMetrics) {
          console.log('[DEBUG] Using cachedComments metrics (current has no valid metrics)');
          Object.assign(candidateEngagement, cachedComments.engagement);
        } else if (currentHasValidMetrics) {
          console.log('[DEBUG] BLOCKING cachedComments - current metrics are valid');
          // NO hacer nada - mantener las métricas actuales
        } else {
          console.log('[DEBUG] Both sources have no valid metrics - keeping current');
        }
      }
      
      // PROTECCIÓN: Si linkData tiene métricas válidas, priorizarlas
      if (linkData.engagement && Object.values(linkData.engagement).some(v => typeof v === 'number' && v > 0)) {
        console.log('[DEBUG] PROTECTING linkData.engagement - overriding candidateEngagement');
        Object.assign(candidateEngagement, linkData.engagement);
        console.log('[DEBUG] FINAL PROTECTED candidateEngagement:', candidateEngagement);
      }
      
      // FORZAR: Si tenemos métricas válidas, NO permitir que se sobrescriban
      const hasValidMetrics = Object.values(candidateEngagement).some(v => typeof v === 'number' && v > 0);
      if (hasValidMetrics) {
        console.log('[DEBUG] FORCING valid metrics - blocking any overwrites');
        // Marcar como protegido para evitar sobrescritura posterior
        candidateEngagement._protected = true;
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
        // Keep isPending: true for X posts without cached analysis (still being processed)
        isPending: platform === 'x' && postId && !cachedXAnalysis ? true : false,
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
        xAnalysisInfo: cachedXAnalysis
          ? {
              postId: cachedXAnalysis.postId,
              type: cachedXAnalysis.type,
              summary: cachedXAnalysis.summary,
              transcript: cachedXAnalysis.transcript,
              images: cachedXAnalysis.images,
              text: cachedXAnalysis.text,
              topic: cachedXAnalysis.topic,
              sentiment: cachedXAnalysis.sentiment,
              entities: cachedXAnalysis.entities || [],  // ✅ Load cached entities
              loading: false,
              error: null,
              lastUpdated: cachedXAnalysis.createdAt,
            }
          : undefined,
      };

      // Replace pending item with actual processed item
      set((state) => ({
        items: state.items.map((item) => 
          item.id === pendingId ? newItem : item
        ),
      }));

      if (postId && platform && shouldRefetch) {
        startCommentFetch(newItem.id, linkData.url, platform, postId, totalCount);
      }

      // Auto-analyze Instagram posts in background
      if (platform === 'instagram' && postId && !cachedAnalysis) {
        console.log('[SavedStore] Auto-analyzing Instagram post:', postId);
        runAnalysisForItem(newItem.id, linkData.url, baseData.description).catch((error) => {
          console.error('[SavedStore] Auto-analysis failed for Instagram post:', error);
        });
      }

      // Auto-analyze X posts DISABLED - analysis takes too long and times out in browser
      // Users can manually trigger analysis by clicking on the post
      if (platform === 'x' && postId && !cachedXAnalysis) {
        console.log('[SavedStore] X post saved - analysis available on demand');
        // Analysis will be triggered manually by user clicking on the card
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
    analyzeXPost: async (id: string) => {
      const item = get().items.find((saved) => saved.id === id);
      if (!item) {
        return;
      }

      await runXAnalysisForItem(item.id, item.url, item.description);
    },
    refreshXAnalysis: async (id: string) => {
      const item = get().items.find((saved) => saved.id === id);
      if (!item) {
        return;
      }

      await runXAnalysisForItem(item.id, item.url, item.description, true);
    },
  };
};

export const useSavedStore = create<SavedState>()(
  persist(createSavedState, {
    name: 'saved-storage',
    storage: createJSONStorage(() => asyncStorageAdapter),
    partialize: (state) => ({ 
      items: state.items,
      // Don't persist loading state
    }),
  })
);
