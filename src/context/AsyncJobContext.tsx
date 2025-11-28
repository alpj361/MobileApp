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
 * Simplified Provider for async jobs
 * Only handles job cancellation, no complex recovery logic
 */
export function AsyncJobProvider({ children }: AsyncJobProviderProps) {
  const activeJobController = useRef<AbortController | null>(null);

  const setActiveJobController = (controller: AbortController | null) => {
    activeJobController.current = controller;
  };

  const cancelActiveJob = () => {
    if (activeJobController.current) {
      console.log('[AsyncJobProvider] Canceling active job');
      activeJobController.current.abort();
      activeJobController.current = null;
    }
  };

  return (
    <AsyncJobContext.Provider
      value={{
        activeJobController,
        setActiveJobController,
        cancelActiveJob,
      }}
    >
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