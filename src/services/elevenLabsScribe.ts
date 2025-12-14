/**
 * ElevenLabs Scribe - Real-time Speech to Text Service
 *
 * This service provides real-time audio transcription using ElevenLabs' Scribe API.
 * It uses WebSocket connection for streaming audio and receiving transcriptions.
 *
 * Documentation:
 * - https://elevenlabs.io/docs/api-reference/realtime-speech-to-text
 * - https://elevenlabs.io/docs/developer-guides/realtime-speech-to-text
 */

interface ScribeConfig {
  apiKey: string;
  language?: string; // ISO 639-1 code (e.g., 'en', 'es', 'fr')
  enableTimestamps?: boolean;
  enablePunctuation?: boolean;
  enableNumberFormatting?: boolean;
}

interface TranscriptionSegment {
  text: string;
  start?: number;
  end?: number;
  isFinal: boolean;
}

type TranscriptionCallback = (segment: TranscriptionSegment) => void;
type ErrorCallback = (error: Error) => void;

export class ElevenLabsScribe {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private config: ScribeConfig;
  private onTranscription: TranscriptionCallback;
  private onError: ErrorCallback;
  private isConnected = false;

  constructor(
    config: ScribeConfig,
    onTranscription: TranscriptionCallback,
    onError: ErrorCallback
  ) {
    this.apiKey = config.apiKey;
    this.config = config;
    this.onTranscription = onTranscription;
    this.onError = onError;
  }

  /**
   * Connect to ElevenLabs Scribe WebSocket
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Build WebSocket URL with query parameters
        const params = new URLSearchParams({
          api_key: this.apiKey,
        });

        if (this.config.language) {
          params.append('language', this.config.language);
        }

        const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation/realtime-speech-to-text?${params.toString()}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('ElevenLabs Scribe: Connected to WebSocket');
          this.isConnected = true;

          // Send initial configuration
          this.sendConfig();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('ElevenLabs Scribe: WebSocket error', error);
          this.isConnected = false;
          this.onError(new Error('WebSocket connection error'));
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('ElevenLabs Scribe: WebSocket closed');
          this.isConnected = false;
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send initial configuration to Scribe
   */
  private sendConfig(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const config = {
      type: 'config',
      config: {
        enable_timestamps: this.config.enableTimestamps ?? true,
        enable_punctuation: this.config.enablePunctuation ?? true,
        enable_number_formatting: this.config.enableNumberFormatting ?? true,
      },
    };

    this.ws.send(JSON.stringify(config));
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      if (message.type === 'transcription') {
        const segment: TranscriptionSegment = {
          text: message.text || '',
          start: message.start,
          end: message.end,
          isFinal: message.is_final || false,
        };

        this.onTranscription(segment);
      } else if (message.type === 'error') {
        this.onError(new Error(message.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('ElevenLabs Scribe: Error parsing message', error);
    }
  }

  /**
   * Send audio chunk to Scribe for transcription
   * @param audioData - Base64 encoded audio data (PCM16, 16kHz mono)
   */
  sendAudio(audioData: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('ElevenLabs Scribe: Cannot send audio, WebSocket not connected');
      return;
    }

    const message = {
      type: 'audio',
      audio: audioData,
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Signal end of audio stream
   */
  endAudioStream(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      type: 'end_of_stream',
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Disconnect from Scribe
   */
  disconnect(): void {
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.endAudioStream();
      }
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}

/**
 * Create and initialize an ElevenLabs Scribe instance
 */
export const createScribeInstance = (
  onTranscription: TranscriptionCallback,
  onError: ErrorCallback,
  options?: Partial<ScribeConfig>
): ElevenLabsScribe => {
  const apiKey =
    process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ||
    process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set. Please add it in the ENV tab.');
  }

  const config: ScribeConfig = {
    apiKey,
    language: options?.language || 'en',
    enableTimestamps: options?.enableTimestamps ?? true,
    enablePunctuation: options?.enablePunctuation ?? true,
    enableNumberFormatting: options?.enableNumberFormatting ?? true,
  };

  return new ElevenLabsScribe(config, onTranscription, onError);
};
