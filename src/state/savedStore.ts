import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinkData, processLink } from '../api/link-processor';
import { EnhancedLinkData, processEnhancedLink, isEnhancedProcessingAvailable } from '../api/enhanced-link-processor';

export interface SavedItem extends LinkData {
  id: string;
  source: 'chat' | 'clipboard' | 'manual';
  isFavorite?: boolean;
  // Enhanced metadata fields
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
  metadataSource?: 'linkpreview' | 'microlink' | 'oembed' | 'html_scraping' | 'fallback';
  imageValidated?: boolean;
  descriptionSource?: 'meta' | 'og' | 'twitter' | 'content' | 'generated';
  processingTime?: number;
  retryCount?: number;
  lastUpdated?: number;
}

interface SavedState {
  items: SavedItem[];
  isLoading: boolean;
  addSavedItem: (linkData: LinkData, source?: SavedItem['source']) => Promise<void>;
  removeSavedItem: (id: string) => void;
  toggleFavorite: (id: string) => void;
  updateSavedItem: (id: string, patch: Partial<SavedItem>) => void;
  reprocessSavedItem: (id: string) => Promise<void>;
  getSavedItems: () => SavedItem[];
  getSavedItemsByType: (type: LinkData['type']) => SavedItem[];
  getSavedItemsByQuality: (quality: SavedItem['quality']) => SavedItem[];
  clearSavedItems: () => void;
  setLoading: (loading: boolean) => void;
  getQualityStats: () => { excellent: number; good: number; fair: number; poor: number };
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      
      addSavedItem: async (linkData, source = 'manual') => {
        // Check if URL already exists
        const existingItem = get().items.find(item => item.url === linkData.url);
        if (existingItem) {
          console.log('Link already saved:', linkData.url);
          return;
        }

        // Try enhanced processing if available
        let enhancedData: EnhancedLinkData | LinkData = linkData;
        if (isEnhancedProcessingAvailable()) {
          try {
            enhancedData = await processEnhancedLink(linkData.url);
          } catch (error) {
            console.log('Enhanced processing failed, using original data:', error);
          }
        }
        
        const newItem: SavedItem = {
          ...enhancedData,
          id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
          source,
          isFavorite: false,
        };
        
        set((state) => ({
          items: [newItem, ...state.items], // Add to beginning for newest first
        }));
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
          // Try enhanced processing first if available
          let fresh: EnhancedLinkData | LinkData;
          if (isEnhancedProcessingAvailable()) {
            fresh = await processEnhancedLink(item.url);
          } else {
            fresh = await processLink(item.url);
          }
          
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
    }),
    {
      name: 'saved-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        items: state.items,
        // Don't persist loading state
      }),
    }
  )
);