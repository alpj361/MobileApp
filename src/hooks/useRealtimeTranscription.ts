/**
 * Hook for real-time audio transcription using ElevenLabs Scribe
 *
 * This hook manages the lifecycle of real-time transcription:
 * - Connects to ElevenLabs Scribe WebSocket
 * - Captures audio from microphone
 * - Streams audio to Scribe for real-time transcription
 * - Manages transcription state
 */

import { useEffect, useRef, useCallback } from 'react';
import { createScribeInstance, ElevenLabsScribe } from '../services/elevenLabsScribe';

interface UseRealtimeTranscriptionProps {
  enabled: boolean;
  onTranscriptionUpdate: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  language?: string;
}

export const useRealtimeTranscription = ({
  enabled,
  onTranscriptionUpdate,
  onError,
  language = 'es',
}: UseRealtimeTranscriptionProps) => {
  const scribeRef = useRef<ElevenLabsScribe | null>(null);
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
    if (isConnectedRef.current || !enabled) return;

    try {
      const scribe = createScribeInstance(handleTranscription, handleError, {
        language,
        enableTimestamps: true,
        enablePunctuation: true,
        enableNumberFormatting: true,
      });

      await scribe.connect();
      scribeRef.current = scribe;
      isConnectedRef.current = true;
      console.log('✅ ElevenLabs Scribe connected');
    } catch (error) {
      console.error('Failed to connect to ElevenLabs Scribe:', error);
      handleError(error as Error);
    }
  }, [enabled, handleTranscription, handleError, language]);

  const disconnect = useCallback(() => {
    if (scribeRef.current) {
      scribeRef.current.disconnect();
      scribeRef.current = null;
      isConnectedRef.current = false;
      console.log('❌ ElevenLabs Scribe disconnected');
    }
  }, []);

  const sendAudio = useCallback((audioData: string) => {
    if (scribeRef.current && isConnectedRef.current) {
      scribeRef.current.sendAudio(audioData);
    }
  }, []);

  const endStream = useCallback(() => {
    if (scribeRef.current && isConnectedRef.current) {
      scribeRef.current.endAudioStream();
    }
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
    isConnected: isConnectedRef.current,
  };
};
