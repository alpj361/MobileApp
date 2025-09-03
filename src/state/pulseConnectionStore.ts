import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PulseUser, ConnectionResult, connectWithEmail } from '../services/pulseAuth';

export interface ConnectionState {
  // Estado de conexión
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Datos del usuario conectado
  connectedUser: PulseUser | null;
  connectionMethod: 'google' | 'email' | null;
  connectedAt: string | null;
  
  // Acciones
  setConnectionResult: (result: ConnectionResult, method: 'google' | 'email') => void;
  setConnecting: (connecting: boolean) => void;
  connectWithEmail: (email: string, password: string) => Promise<ConnectionResult>;
  disconnect: () => void;
  clearError: () => void;
}

export const usePulseConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      // Estado inicial
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      connectedUser: null,
      connectionMethod: null,
      connectedAt: null,

      // Set connection result from external auth
      setConnectionResult: (result: ConnectionResult, method: 'google' | 'email') => {
        if (result.success && result.user) {
          set({
            isConnected: true,
            isConnecting: false,
            connectedUser: result.user,
            connectionMethod: method,
            connectedAt: new Date().toISOString(),
            connectionError: null,
          });
        } else {
          set({
            isConnecting: false,
            connectionError: result.error || `Error de conexión con ${method}`,
          });
        }
      },

      // Set connecting state
      setConnecting: (connecting: boolean) => {
        set({ isConnecting: connecting, connectionError: connecting ? null : undefined });
      },

      // Conectar con email
      connectWithEmail: async (email: string, password: string) => {
        set({ isConnecting: true, connectionError: null });
        
        try {
          const result = await connectWithEmail(email, password);
          
          if (result.success && result.user) {
            set({
              isConnected: true,
              isConnecting: false,
              connectedUser: result.user,
              connectionMethod: 'email',
              connectedAt: new Date().toISOString(),
              connectionError: null,
            });
          } else {
            set({
              isConnecting: false,
              connectionError: result.error || 'Error de conexión con email',
            });
          }
          
          return result;
        } catch (error) {
          const errorMessage = 'Error inesperado durante la conexión con email';
          set({
            isConnecting: false,
            connectionError: errorMessage,
          });
          
          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      // Desconectar
      disconnect: () => {
        set({
          isConnected: false,
          isConnecting: false,
          connectionError: null,
          connectedUser: null,
          connectionMethod: null,
          connectedAt: null,
        });
      },

      // Limpiar error
      clearError: () => {
        set({ connectionError: null });
      },
    }),
    {
      name: 'pulse-connection-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Solo persistir datos importantes, no estados temporales
      partialize: (state) => ({
        isConnected: state.isConnected,
        connectedUser: state.connectedUser,
        connectionMethod: state.connectionMethod,
        connectedAt: state.connectedAt,
      }),
    }
  )
);

// Selectores útiles
export const usePulseUser = () => usePulseConnectionStore((state) => state.connectedUser);
export const useIsConnected = () => usePulseConnectionStore((state) => state.isConnected);
export const useConnectionStatus = () => usePulseConnectionStore((state) => ({
  isConnected: state.isConnected,
  isConnecting: state.isConnecting,
  error: state.connectionError,
}));
