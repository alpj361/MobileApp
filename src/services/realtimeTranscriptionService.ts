/**
 * Real-time Transcription Service (Backend API)
 *
 * Simplified service that connects to ExtractorW backend instead of
 * directly to ElevenLabs. This provides better security, rate limiting,
 * and centralized management.
 */

interface BackendTranscriptionConfig {
  userId: string;
  language?: string;
  enableTimestamps?: boolean;
  enablePunctuation?: boolean;
  enableNumberFormatting?: boolean;
}

interface TranscriptionSegment {
  text: string;
  start?: number;
  end?: number;
  isFinal: boolean;
  timestamp: number;
}

type TranscriptionCallback = (segment: TranscriptionSegment) => void;
type ErrorCallback = (error: Error) => void;

export class BackendRealtimeTranscriptionService {
  private baseUrl: string;
  private config: BackendTranscriptionConfig;
  private onTranscription: TranscriptionCallback;
  private onError: ErrorCallback;
  private isSessionActive = false;
  private ws: WebSocket | null = null;

  constructor(
    config: BackendTranscriptionConfig,
    onTranscription: TranscriptionCallback,
    onError: ErrorCallback
  ) {
    this.baseUrl = this.getBackendUrl();
    this.config = config;
    this.onTranscription = onTranscription;
    this.onError = onError;
  }

  /**
   * Get backend URL based on environment
   */
  private getBackendUrl(): string {
    // For development, use localhost
    if (__DEV__) {
      return 'http://localhost:8080';
    }

    // For production, use the ExtractorW VPS URL
    return 'https://api.standatpd.com'; // Replace with your actual production URL
  }

  /**
   * Start transcription session
   */
  async startSession(): Promise<void> {
    try {
      console.log('🚀 Iniciando sesión de transcripción backend...');

      const response = await fetch(`${this.baseUrl}/api/realtime-transcription/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.config.userId,
          language: this.config.language || 'es',
          config: {
            enableTimestamps: this.config.enableTimestamps ?? true,
            enablePunctuation: this.config.enablePunctuation ?? true,
            enableNumberFormatting: this.config.enableNumberFormatting ?? true,
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error iniciando sesión');
      }

      const data = await response.json();
      this.isSessionActive = true;

      console.log('✅ Sesión de transcripción iniciada:', data.message);

      // Optionally connect to WebSocket for real-time updates
      this.connectWebSocket();

    } catch (error) {
      console.error('❌ Error iniciando sesión de transcripción:', error);
      this.onError(error as Error);
      throw error;
    }
  }

  /**
   * Connect to WebSocket for real-time updates (optional)
   */
  private connectWebSocket(): void {
    try {
      const wsUrl = `${this.baseUrl.replace('http', 'ws')}:8081/ws/realtime-transcription`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('🔗 WebSocket conectado para transcripción real-time');

        // Initialize session
        this.ws?.send(JSON.stringify({
          type: 'init',
          userId: this.config.userId,
          config: this.config
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'transcription') {
            this.onTranscription({
              text: data.text,
              start: data.start,
              end: data.end,
              isFinal: data.isFinal,
              timestamp: data.timestamp
            });
          } else if (data.type === 'error') {
            this.onError(new Error(data.message));
          }
        } catch (error) {
          console.error('❌ Error procesando mensaje WebSocket:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ Error WebSocket:', error);
        this.onError(new Error('Error de conexión WebSocket'));
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket cerrado');
        this.ws = null;
      };

    } catch (error) {
      console.error('❌ Error conectando WebSocket:', error);
    }
  }

  /**
   * Send audio data to backend for transcription
   */
  async sendAudio(audioData: string): Promise<boolean> {
    if (!this.isSessionActive) {
      console.warn('⚠️ No hay sesión activa para enviar audio');
      return false;
    }

    try {
      // Option 1: Use WebSocket if connected
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'audio',
          audioData: audioData
        }));
        return true;
      }

      // Option 2: Use HTTP endpoint as fallback
      const response = await fetch(`${this.baseUrl}/api/realtime-transcription/audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.config.userId,
          audioData: audioData,
          format: 'base64'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData.needsRestart) {
          // Session expired, restart
          console.warn('⚠️ Sesión expirada, reiniciando...');
          await this.startSession();
          return false;
        }

        throw new Error(errorData.error || 'Error enviando audio');
      }

      return true;

    } catch (error) {
      console.error('❌ Error enviando audio:', error);
      return false;
    }
  }

  /**
   * End audio stream
   */
  async endStream(): Promise<void> {
    try {
      // Send via WebSocket if available
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'end_stream'
        }));
      }

      // Also send via HTTP
      const response = await fetch(`${this.baseUrl}/api/realtime-transcription/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.config.userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('⚠️ Error finalizando stream:', errorData.error);
      }

      console.log('🏁 Stream finalizado');

    } catch (error) {
      console.error('❌ Error finalizando stream:', error);
    }
  }

  /**
   * End transcription session
   */
  async endSession(): Promise<void> {
    try {
      await this.endStream();

      // Close WebSocket
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      // End backend session
      const response = await fetch(`${this.baseUrl}/api/realtime-transcription/session/${this.config.userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('⚠️ Error cerrando sesión:', errorData.error);
      }

      this.isSessionActive = false;
      console.log('🔌 Sesión de transcripción cerrada');

    } catch (error) {
      console.error('❌ Error cerrando sesión:', error);
      this.isSessionActive = false;
    }
  }

  /**
   * Transcribe complete audio file (alternative to real-time)
   */
  async transcribeFile(audioUri: string, metadata: any = {}): Promise<any> {
    try {
      console.log('🎵 Transcribiendo archivo completo via backend...');

      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        name: 'recording.wav',
        type: 'audio/wav'
      } as any);

      formData.append('userId', this.config.userId);
      formData.append('language', this.config.language || 'es');
      formData.append('skipSave', 'false');

      const response = await fetch(`${this.baseUrl}/api/realtime-transcription/file`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error transcribiendo archivo');
      }

      const data = await response.json();
      console.log('✅ Archivo transcrito correctamente');

      return data;

    } catch (error) {
      console.error('❌ Error transcribiendo archivo:', error);
      throw error;
    }
  }

  /**
   * Get session status
   */
  async getStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/realtime-transcription/status/${this.config.userId}`);

      if (!response.ok) {
        throw new Error('Error obteniendo estado');
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Error obteniendo estado:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if session is active
   */
  getIsSessionActive(): boolean {
    return this.isSessionActive;
  }
}

/**
 * Create backend transcription service instance
 */
export const createBackendTranscriptionService = (
  userId: string,
  onTranscription: TranscriptionCallback,
  onError: ErrorCallback,
  options?: Partial<BackendTranscriptionConfig>
): BackendRealtimeTranscriptionService => {
  const config: BackendTranscriptionConfig = {
    userId,
    language: options?.language || 'es',
    enableTimestamps: options?.enableTimestamps ?? true,
    enablePunctuation: options?.enablePunctuation ?? true,
    enableNumberFormatting: options?.enableNumberFormatting ?? true,
    ...options
  };

  return new BackendRealtimeTranscriptionService(config, onTranscription, onError);
};