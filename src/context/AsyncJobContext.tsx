import React, { createContext, useContext, useRef, ReactNode } from 'react';

interface AsyncJobContextType {
  activeJobController: React.MutableRefObject<AbortController | null>;
  setActiveJobController: (controller: AbortController | null) => void;
  cancelActiveJob: () => void;
}

const AsyncJobContext = createContext<AsyncJobContextType | null>(null);

interface AsyncJobProviderProps {
  children: ReactNode;
}

/**
 * Provider para manejar jobs asincrónicos globalmente
 * Permite cancelar jobs desde cualquier parte de la app
 */
export function AsyncJobProvider({ children }: AsyncJobProviderProps) {
  const activeJobController = useRef<AbortController | null>(null);

  const setActiveJobController = (controller: AbortController | null) => {
    // Cancel previous job if exists
    if (activeJobController.current && activeJobController.current !== controller) {
      console.log('[AsyncJobProvider] Cancelling previous job');
      activeJobController.current.abort();
    }

    activeJobController.current = controller;
  };

  const cancelActiveJob = () => {
    if (activeJobController.current) {
      console.log('[AsyncJobProvider] Cancelling active job');
      activeJobController.current.abort();
      activeJobController.current = null;
    }
  };

  return (
    <AsyncJobContext.Provider value={{
      activeJobController,
      setActiveJobController,
      cancelActiveJob,
    }}>
      {children}
    </AsyncJobContext.Provider>
  );
}

export function useAsyncJobContext() {
  const context = useContext(AsyncJobContext);
  if (!context) {
    throw new Error('useAsyncJobContext must be used within AsyncJobProvider');
  }
  return context;
}

/**
 * Hook para obtener el controlador de cancelación actual
 * Útil para componentes que necesitan verificar si hay un job activo
 */
export function useActiveJobStatus() {
  const context = useContext(AsyncJobContext);
  const hasActiveJob = context?.activeJobController.current !== null;

  return {
    hasActiveJob,
    cancelActiveJob: context?.cancelActiveJob,
  };
}