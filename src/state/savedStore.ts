import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinkData, processLink } from '../api/link-processor';

export interface SavedItem extends LinkData {
  id: string;
  source: 'chat' | 'clipboard' | 'manual';
  isFavorite?: boolean;
}

interface SavedState {
  items: SavedItem[];
  isLoading: boolean;
  addSavedItem: (linkData: LinkData, source?: SavedItem['source']) => void;
  removeSavedItem: (id: string) => void;
  toggleFavorite: (id: string) => void;
  updateSavedItem: (id: string, patch: Partial<SavedItem>) => void;
  reprocessSavedItem: (id: string) => Promise<void>;
  getSavedItems: () => SavedItem[];
  getSavedItemsByType: (type: LinkData['type']) => SavedItem[];
  clearSavedItems: () => void;
  setLoading: (loading: boolean) => void;
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      
      addSavedItem: (linkData, source = 'manual') => {
        const newItem: SavedItem = {
          ...linkData,
          id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
          source,
          isFavorite: false,
        };
        
        // Check if URL already exists
        const existingItem = get().items.find(item => item.url === linkData.url);
        if (existingItem) {
          console.log('Link already saved:', linkData.url);
          return;
        }
        
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
          const fresh = await processLink(item.url);
          set((state) => ({
            items: state.items.map(i => 
              i.id === id 
                ? { ...i, 
                    title: fresh.title, 
                    description: fresh.description, 
                    image: fresh.image, 
                    favicon: fresh.favicon, 
                    type: fresh.type, 
                    domain: fresh.domain, 
                    timestamp: Date.now() } 
                : i),
          }));
        } catch (e) {
          // Keep existing item on error
        }
      },
      
      getSavedItems: () => {
        return get().items;
      },
      
      getSavedItemsByType: (type) => {
        return get().items.filter(item => item.type === type);
      },
      
      clearSavedItems: () => {
        set({ items: [] });
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
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