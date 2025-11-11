import React, { createContext, useContext, useRef, ReactNode, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { guestSessionManager } from '../services/guestSessionManager';
import { jobRecoveryService, ActiveJobInfo } from '../services/jobRecoveryService';
import { jobPersistence } from '../services/jobPersistence';

interface AsyncJobContextType {
  activeJobController: React.MutableRefObject<AbortController | null>;
  setActiveJobController: (controller: AbortController | null) => void;
  cancelActiveJob: () => void;
  recoveredJobs: ActiveJobInfo[];
  isRecovering: boolean;
}

const AsyncJobContext = createContext<AsyncJobContextType | null>(null);

interface AsyncJobProviderProps {
  children: ReactNode;
}

/**
 * Provider para manejar jobs asincrónicos globalmente
 * Permite cancelar jobs desde cualquier parte de la app
 * Recupera jobs activos al iniciar la sesión
 */
export function AsyncJobProvider({ children }: AsyncJobProviderProps) {
  const activeJobController = useRef<AbortController | null>(null);
  const [recoveredJobs, setRecoveredJobs] = useState<ActiveJobInfo[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);

  // Initialize guest session and recover jobs on mount
  useEffect(() => {
    const initializeAndRecover = async () => {
      try {
        // Step 1: Initialize session
        const session = await guestSessionManager.initializeSession();
        console.log('[AsyncJobProvider] Session initialized:', session.type);

        // Step 2: Recover active jobs
        setIsRecovering(true);
        const jobs = await jobRecoveryService.recoverJobsOnStart();

        if (jobs.length > 0) {
          console.log(`[AsyncJobProvider] Recovered ${jobs.length} active job(s)`);
          setRecoveredJobs(jobs);
        } else {
          console.log('[AsyncJobProvider] No jobs to recover');
        }
      } catch (error) {
        console.error('[AsyncJobProvider] Failed to initialize session or recover jobs:', error);
      } finally {
        setIsRecovering(false);
      }
    };

    initializeAndRecover();
  }, []);

  // Web-specific: Save job state before page unload
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      console.log('[AsyncJobProvider] 💾 Page unloading - ensuring jobs are persisted');
      
      // Get all active jobs from localStorage
      const activeJobs = await jobPersistence.getActiveJobs();
      
      if (activeJobs.length > 0) {
        console.log(`[AsyncJobProvider] Found ${activeJobs.length} active job(s) to persist`);
        // Jobs are already in localStorage from when they were created
        // This is just a safety check
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Web-specific: Handle visibility changes (tab switching, minimize)
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[AsyncJobProvider] 👁️ Page hidden - pausing active polling');
        // Note: Individual polling loops should check document.hidden
        // This is just for logging/awareness
      } else {
        console.log('[AsyncJobProvider] 👁️ Page visible - resuming polling');
        // Polling will automatically resume when page becomes visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
      recoveredJobs,
      isRecovering,
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

/**
 * Hook para obtener jobs recuperados
 * Útil para componentes que necesitan mostrar o resumir jobs pendientes
 */
export function useRecoveredJobs() {
  const context = useContext(AsyncJobContext);

  return {
    recoveredJobs: context?.recoveredJobs || [],
    isRecovering: context?.isRecovering || false,
  };
}