import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { checkAllSavedItemsCodexStatus } from '../services/codexService';
import { SavedItem } from './savedStore';

interface CodexStatus {
  exists: boolean;
  id?: string;
}

interface CodexStatusStore {
  // Map of URL -> { exists: boolean, id?: string }
  codexStatus: Record<string, CodexStatus>;
  
  // Actions
  setCodexStatus: (url: string, status: CodexStatus) => void;
  setMultipleCodexStatus: (statusMap: Record<string, CodexStatus>) => void;
  getCodexStatus: (url: string) => CodexStatus;
  refreshAllCodexStatus: (items: SavedItem[]) => Promise<void>;
  clearCodexStatus: () => void;
}

export const useCodexStatusStore = create<CodexStatusStore>()(
  persist(
    (set, get) => ({
      codexStatus: {},
      
      setCodexStatus: (url: string, status: CodexStatus) => {
        set((state) => ({
          codexStatus: {
            ...state.codexStatus,
            [url]: status,
          },
        }));
      },
      
      setMultipleCodexStatus: (statusMap: Record<string, CodexStatus>) => {
        set((state) => ({
          codexStatus: {
            ...state.codexStatus,
            ...statusMap,
          },
        }));
      },
      
      getCodexStatus: (url: string) => {
        return get().codexStatus[url] || { exists: false };
      },
      
      refreshAllCodexStatus: async (items: SavedItem[]) => {
        try {
          const statusMap = await checkAllSavedItemsCodexStatus(items);
          get().setMultipleCodexStatus(statusMap);
        } catch (error) {
          console.error('Error refreshing codex status:', error);
        }
      },
      
      clearCodexStatus: () => {
        set({ codexStatus: {} });
      },
    }),
    {
      name: 'codex-status-storage',
      // Only persist the codexStatus data
      partialize: (state) => ({ codexStatus: state.codexStatus }),
    }
  )
);
