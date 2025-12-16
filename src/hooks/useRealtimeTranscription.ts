/**
 * Hook for real-time audio transcription using Backend API
 *
 * This hook manages the lifecycle of real-time transcription:
 * - Connects to ExtractorW backend instead of directly to ElevenLabs
 * - Provides better security and rate limiting
 * - Manages transcription state through backend API
 */

import { useEffect, useRef, useCallback } from 'react';
import { createBackendTranscriptionService, BackendRealtimeTranscriptionService } from '../services/realtimeTranscriptionService';

interface UseRealtimeTranscriptionProps {
  enabled: boolean;
  userId: string; // Required for backend session management
  onTranscriptionUpdate: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  language?: string;
}

export const useRealtimeTranscription = ({
  enabled,
  userId,
  onTranscriptionUpdate,
  onError,
  language = 'es',
}: UseRealtimeTranscriptionProps) => {
  const serviceRef = useRef<BackendRealtimeTranscriptionService | null>(null);
  const isConnectedRef = useRef(false);

  const handleTranscription = useCallback(
    (segment: { text: string; isFinal: boolean }) => {
      onTranscriptionUpdate(segment.text, segment.isFinal);
    },
    [onTranscriptionUpdate]
  );

  const handleError = useCallback(
    (error: Error) => {
      console.error('Realtime transcription error:', error);
      onError?.(error);
    },
    [onError]
  );

  const connect = useCallback(async () => {
    if (isConnectedRef.current || !enabled || !userId) return;

    try {
      const service = createBackendTranscriptionService(
        userId,
        handleTranscription,
        handleError,
        {
          language,
          enableTimestamps: true,
          enablePunctuation: true,
          enableNumberFormatting: true,
        }
      );

      await service.startSession();
      serviceRef.current = service;
      isConnectedRef.current = true;
      console.log('✅ Backend transcription service connected');
    } catch (error) {
      console.error('Failed to connect to backend transcription service:', error);
      handleError(error as Error);
    }
  }, [enabled, userId, handleTranscription, handleError, language]);

  const disconnect = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.endSession();
      serviceRef.current = null;
      isConnectedRef.current = false;
      console.log('❌ Backend transcription service disconnected');
    }
  }, []);

  const sendAudio = useCallback(async (audioData: string) => {
    if (serviceRef.current && isConnectedRef.current) {
      return await serviceRef.current.sendAudio(audioData);
    }
    return false;
  }, []);

  const endStream = useCallback(async () => {
    if (serviceRef.current && isConnectedRef.current) {
      await serviceRef.current.endStream();
    }
  }, []);

  const transcribeFile = useCallback(async (audioUri: string, metadata: any = {}) => {
    if (serviceRef.current) {
      return await serviceRef.current.transcribeFile(audioUri, metadata);
    }
    throw new Error('Servicio de transcripción no iniciado');
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    connect,
    disconnect,
    sendAudio,
    endStream,
    transcribeFile,
    isConnected: isConnectedRef.current,
  };
};
