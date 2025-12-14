import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Recording {
  id: string;
  title: string;
  uri: string;
  duration: number;
  timestamp: number;
  transcription?: string;
  isTranscribing?: boolean;
  realtimeTranscription?: string; // Live transcription from ElevenLabs Scribe
  isRealtimeTranscribing?: boolean; // Flag for real-time transcription active
}

interface RecordingState {
  recordings: Recording[];
  isRecording: boolean;
  currentRecording: Recording | null;
  realtimeTranscriptionEnabled: boolean;
  addRecording: (recording: Omit<Recording, 'id' | 'timestamp'>) => void;
  updateRecording: (id: string, updates: Partial<Recording>) => void;
  deleteRecording: (id: string) => void;
  setRecording: (recording: boolean) => void;
  setCurrentRecording: (recording: Recording | null) => void;
  setRealtimeTranscriptionEnabled: (enabled: boolean) => void;
  appendRealtimeTranscription: (id: string, text: string) => void;
}

export const useRecordingStore = create<RecordingState>()(
  persist(
    (set) => ({
      recordings: [],
      isRecording: false,
      currentRecording: null,
      realtimeTranscriptionEnabled: false,
      addRecording: (recording) => {
        const newRecording: Recording = {
          ...recording,
          id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
          timestamp: Date.now(),
        };
        set((state) => ({
          recordings: [newRecording, ...state.recordings],
        }));
      },
      updateRecording: (id, updates) => {
        set((state) => ({
          recordings: state.recordings.map((recording) =>
            recording.id === id ? { ...recording, ...updates } : recording
          ),
        }));
      },
      deleteRecording: (id) => {
        set((state) => ({
          recordings: state.recordings.filter((recording) => recording.id !== id),
        }));
      },
      setRecording: (recording) => set({ isRecording: recording }),
      setCurrentRecording: (recording) => set({ currentRecording: recording }),
      setRealtimeTranscriptionEnabled: (enabled) =>
        set({ realtimeTranscriptionEnabled: enabled }),
      appendRealtimeTranscription: (id, text) => {
        set((state) => ({
          recordings: state.recordings.map((recording) =>
            recording.id === id
              ? {
                  ...recording,
                  realtimeTranscription: (recording.realtimeTranscription || '') + text,
                }
              : recording
          ),
        }));
      },
    }),
    {
      name: 'recording-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ recordings: state.recordings }),
    }
  )
);