/**
 * Simplified Saved Store
 * Uses direct database persistence without complex job management
 * Replaces the complex savedStore with a simpler approach
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { asyncStorageAdapter } from '../storage/platform-storage';
import { LinkData } from '../api/link-processor';
import { simplePostService, SimplePostResponse } from '../services/postPersistenceService';

export interface SavedItem extends LinkData {
  id: string;
  source: 'chat' | 'clipboard' | 'manual';
  isFavorite?: boolean;
  isPending?: boolean; // Only for immediate UI feedback during save
  status?: 'saved' | 'processing' | 'completed' | 'failed'; // Database status
  lastUpdated?: number;

  // Keep existing fields for backward compatibility
  outerErrorMessage?: string;
  codex_id?: string;
  codex_category?: 'general' | 'monitoring' | 'wiki';
  codex_subcategory?: string;
  codex_metadata?: Record<string, any>;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
  contentScore?: number;
  hasCleanDescription?: boolean;
  imageQuality?: 'high' | 'medium' | 'low' | 'none';
  processingTime?: number;

  // Analysis fields (simplified)
  analysisResult?: any; // Analysis data when completed
  analysisError?: string;
}

interface SimpleSavedState {
  items: SavedItem[];
  isLoading: boolean;
  isInitialized: boolean;

  // Analysis modal state
  analysisModal: {
    visible: boolean;
    postUrl?: string;
    stage: 'saving' | 'extracting' | 'analyzing' | 'completed' | 'error';
    itemId?: string;
  };

  // Core actions
  initializeStore: () => Promise<void>;
  addSavedItem: (linkData: LinkData, source?: SavedItem['source']) => Promise<boolean>;
  removeSavedItem: (id: string) => void;
  updateSavedItem: (id: string, patch: Partial<SavedItem>) => void;
  clearSavedItems: () => void;

  // Analysis actions (simplified)
  startAnalysis: (id: string) => Promise<void>;
  pollForAnalysisCompletion: (id: string) => void;

  // Modal actions
  showAnalysisModal: (postUrl: string, itemId: string) => void;
  hideAnalysisModal: () => void;
  updateAnalysisStage: (stage: SimpleSavedState['analysisModal']['stage']) => void;

  // Utility actions
  toggleFavorite: (id: string) => void;
  setCodexId: (id: string, codex_id: string) => void;
  setLoading: (loading: boolean) => void;

  // Getters
  getSavedItems: () => SavedItem[];
  getSavedItemsByType: (type: LinkData['type']) => SavedItem[];
  getSavedItemsByQuality: (quality: SavedItem['quality']) => SavedItem[];
  getQualityStats: () => { excellent: number; good: number; fair: number; poor: number };
}

export const useSavedStore = create<SimpleSavedState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      isInitialized: false,

      // Analysis modal state
      analysisModal: {
        visible: false,
        stage: 'saving'
      },

      /**
       * Initialize store - load posts from backend
       */
      initializeStore: async () => {
        if (get().isInitialized) return;

        console.log('[SimpleSavedStore] Initializing store...');
        set({ isLoading: true });

        try {
          const backendPosts = await simplePostService.loadPosts();
          console.log(`[SimpleSavedStore] 📥 Loaded ${backendPosts.length} posts from backend`);

          // Log status distribution
          const statusCounts = backendPosts.reduce((acc, post) => {
            acc[post.status || 'unknown'] = (acc[post.status || 'unknown'] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          console.log('[SimpleSavedStore] Post statuses:', statusCounts);

          set({
            items: backendPosts,
            isInitialized: true
          });

          // Recovery mechanism
          backendPosts.forEach(post => {
            if (post.status === 'saved' || post.status === 'processing') {
              console.log(`[SimpleSavedStore] 🔄 RECOVERY NEEDED for: ${post.url} (ID: ${post.id}, Status: ${post.status})`);
              get().startAnalysis(post.id);
            }
          });
        } catch (error) {
          console.error('[SimpleSavedStore] ❌ Initialization failed:', error);
          set({ isInitialized: true });
        } finally {
          set({ isLoading: false });
        }
      },

      /**
       * Add a new saved item with immediate database persistence
       */
      addSavedItem: async (linkData: LinkData, source: SavedItem['source'] = 'manual') => {
        const tempId = `temp_${Date.now()}`;
        console.log(`[SimpleSavedStore] ➕ Adding new item: ${linkData.url} (TempID: ${tempId})`);

        const newItem: SavedItem = {
          ...linkData,
          id: tempId,
          source,
          isPending: true,
          status: 'saved',
          lastUpdated: Date.now(),
        };

        // Optimistic update
        set(state => ({ items: [newItem, ...state.items] }));
        get().showAnalysisModal(newItem.url, newItem.id);

        try {
          const response = await simplePostService.savePost(newItem);

          if (!response.success || !response.post) {
            throw new Error(response.error || 'Failed to save to backend');
          }

          const realId = response.post.id;
          console.log(`[SimpleSavedStore] ✅ Saved to backend. TempID: ${tempId} -> RealID: ${realId}`);

          // Update with real ID from backend
          set(state => ({
            items: state.items.map(item =>
              item.id === tempId
                ? { ...item, id: realId, isPending: false }
                : item
            )
          }));

          // Update modal with real ID
          set(state => ({
            analysisModal: {
              ...state.analysisModal,
              itemId: realId
            }
          }));

          // Start analysis with REAL ID
          console.log(`[SimpleSavedStore] 🚀 Triggering analysis for RealID: ${realId}`);
          get().startAnalysis(realId);

          return true;
        } catch (error) {
          console.error('[SimpleSavedStore] ❌ Failed to save item:', error);
          // Revert optimistic update
          set(state => ({
            items: state.items.filter(i => i.id !== tempId)
          }));
          get().hideAnalysisModal();
          return false;
        }
      },

      removeSavedItem: async (id: string) => {
        console.log(`[SimpleSavedStore] 🗑️ Removing item: ${id}`);
        set(state => ({
          items: state.items.filter(i => i.id !== id)
        }));
        await simplePostService.deletePost(id);
      },

      updateSavedItem: (id: string, patch: Partial<SavedItem>) => {
        // console.log(`[SimpleSavedStore] 📝 Updating item ${id}:`, Object.keys(patch));
        set(state => ({
          items: state.items.map(item =>
            item.id === id
              ? { ...item, ...patch, lastUpdated: Date.now() }
              : item
          )
        }));
      },

      clearSavedItems: () => {
        console.log('[SimpleSavedStore] 🧹 Clearing all items');
        set({ items: [] });
        // Note: This doesn't clear backend data - implement if needed
      },

      /**
       * Start analysis for an item
       */
      startAnalysis: async (id: string) => {
        const item = get().items.find(i => i.id === id);
        if (!item) {
          console.error(`[SimpleSavedStore] ❌ startAnalysis: Item not found for ID: ${id}`);
          return;
        }

        console.log(`[SimpleSavedStore] 🎬 Starting analysis for: ${item.url} (ID: ${id})`);

        // Update status to processing and modal stage
        get().updateSavedItem(id, { status: 'processing' });
        get().updateAnalysisStage('analyzing');

        // Start analysis promise chain
        simplePostService.startAnalysis(item)
          .then((result) => {
            console.log(`[SimpleSavedStore] 📩 Analysis promise resolved for ${id}. Success: ${result?.success}`);
            if (result && result.success) {
              console.log(`[SimpleSavedStore] ✅ Analysis Data Received for ${id}:`, {
                hasData: !!result.data,
                keys: result.data ? Object.keys(result.data) : [],
                transcriptionCount: result.data?.transcription?.length,
                aiGenerated: !!result.data?.ai_generated
              });

              get().updateSavedItem(id, {
                status: 'completed',
                analysisResult: result.data, // Direct update!
                lastUpdated: Date.now()
              });
              get().updateAnalysisStage('completed');
            } else {
              console.warn(`[SimpleSavedStore] ⚠️ Analysis resolved but success=false for ${id}`, result);
            }
          })
          .catch(error => {
            console.error(`[SimpleSavedStore] ❌ Analysis failed for ${id}:`, error);
            get().updateSavedItem(id, {
              status: 'failed',
              analysisError: error instanceof Error ? error.message : 'Analysis failed'
            });
            get().updateAnalysisStage('error');
            // Hide modal after 3 seconds
            setTimeout(() => get().hideAnalysisModal(), 3000);
          });

        // Keep polling as backup
        get().pollForAnalysisCompletion(id);
      },

      /**
       * Poll for analysis completion
       */
      pollForAnalysisCompletion: (id: string) => {
        const pollInterval = setInterval(async () => {
          try {
            const updates = await simplePostService.checkForUpdates();
            const item = get().items.find(i => i.id === id);

            if (!item) {
              clearInterval(pollInterval);
              return;
            }

            const update = updates.find(u => u.url === item.url);

            if (update && update.status === 'completed') {
              get().updateSavedItem(id, {
                status: 'completed',
                analysisResult: update.analysis_data,
                lastUpdated: new Date(update.updated_at).getTime()
              });

              get().updateAnalysisStage('completed');

              // Hide modal after 2 seconds to show completion
              setTimeout(() => get().hideAnalysisModal(), 2000);

              clearInterval(pollInterval);
            } else if (update && update.status === 'failed') {
              get().updateSavedItem(id, {
                status: 'failed',
                analysisError: 'Analysis failed'
              });

              get().updateAnalysisStage('error');
              setTimeout(() => get().hideAnalysisModal(), 3000);

              clearInterval(pollInterval);
            }
          } catch (error) {
            console.error('[SimpleSavedStore] Error polling for updates:', error);
          }
        }, 3000); // Poll every 3 seconds

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          get().updateAnalysisStage('error');
          setTimeout(() => get().hideAnalysisModal(), 3000);
        }, 300000);
      },

      /**
       * Show analysis modal
       */
      showAnalysisModal: (postUrl: string, itemId: string) => {
        set(state => ({
          analysisModal: {
            visible: true,
            postUrl,
            itemId,
            stage: 'saving'
          }
        }));
      },

      /**
       * Hide analysis modal
       */
      hideAnalysisModal: () => {
        set(state => ({
          analysisModal: {
            visible: false,
            stage: 'saving'
          }
        }));
      },

      /**
       * Update analysis stage
       */
      updateAnalysisStage: (stage: SimpleSavedState['analysisModal']['stage']) => {
        set(state => ({
          analysisModal: {
            ...state.analysisModal,
            stage
          }
        }));
      },

      /**
       * Toggle favorite status
       */
      toggleFavorite: (id: string) => {
        set(state => ({
          items: state.items.map(item =>
            item.id === id
              ? { ...item, isFavorite: !item.isFavorite }
              : item
          )
        }));
      },

      /**
       * Set codex ID for an item
       */
      setCodexId: (id: string, codex_id: string) => {
        get().updateSavedItem(id, { codex_id });
      },

      /**
       * Clear all saved items
       */


      /**
       * Set loading state
       */
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      /**
       * Get all saved items
       */
      getSavedItems: () => get().items,

      /**
       * Get saved items by type
       */
      getSavedItemsByType: (type: LinkData['type']) => {
        return get().items.filter(item => item.type === type);
      },

      /**
       * Get saved items by quality
       */
      getSavedItemsByQuality: (quality: SavedItem['quality']) => {
        return get().items.filter(item => item.quality === quality);
      },

      /**
       * Get quality statistics
       */
      getQualityStats: () => {
        const items = get().items;
        return items.reduce(
          (stats, item) => {
            if (item.quality) {
              stats[item.quality]++;
            }
            return stats;
          },
          { excellent: 0, good: 0, fair: 0, poor: 0 }
        );
      },
    }),
    {
      name: 'simple-saved-storage',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({
        items: state.items,
        // Exclude isLoading, isInitialized, and analysisModal
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoading = false;
          state.isInitialized = false; // Force re-initialization on app start
        }
      },
    }
  )
);

/**
 * Hook to periodically check for analysis updates
 * Simple polling mechanism for completed analyses
 */
export const useAnalysisUpdates = () => {
  const updateSavedItem = useSavedStore(state => state.updateSavedItem);

  const checkForUpdates = async () => {
    try {
      const updates = await simplePostService.checkForUpdates();

      updates.forEach(update => {
        // Find item by URL since backend might have different IDs
        const items = useSavedStore.getState().items;
        const item = items.find(i => i.url === update.url);

        if (item) {
          updateSavedItem(item.id, {
            status: update.status as any,
            analysisResult: update.analysis_data,
            lastUpdated: new Date(update.updated_at).getTime()
          });
        }
      });

      if (updates.length > 0) {
        console.log(`[SimpleSavedStore] Applied ${updates.length} analysis updates`);
      }
    } catch (error) {
      console.error('[SimpleSavedStore] Error checking for updates:', error);
    }
  };

  return { checkForUpdates };
};