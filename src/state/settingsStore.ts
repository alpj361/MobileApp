import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ConnectionStatus {
  id: string;
  name: string;
  isConnected: boolean;
  lastConnected?: string;
  icon: string;
  description?: string;
}

interface SettingsState {
  connections: ConnectionStatus[];
  toggleConnection: (id: string) => void;
  getConnection: (id: string) => ConnectionStatus | undefined;
  addConnection: (connection: ConnectionStatus) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      connections: [
        {
          id: 'pulqum',
          name: 'Pulqum',
          isConnected: false,
          icon: 'link-outline',
          description: 'Conecta con el servicio Pulqum para sincronizar datos'
        }
      ],
      
      toggleConnection: (id: string) => {
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.id === id
              ? {
                  ...conn,
                  isConnected: !conn.isConnected,
                  lastConnected: !conn.isConnected ? new Date().toISOString() : conn.lastConnected
                }
              : conn
          )
        }));
      },
      
      getConnection: (id: string) => {
        return get().connections.find((conn) => conn.id === id);
      },
      
      addConnection: (connection: ConnectionStatus) => {
        set((state) => ({
          connections: [...state.connections, connection]
        }));
      }
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);