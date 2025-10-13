/*
VIZTA SERVICE - AI Chat Integration with ExtractorW
This service connects the mobile app to Vizta AI agent with powerful tools:
- Twitter/X search and analysis (nitter_context, nitter_profile)
- Web search (perplexity_search)
- Political trends analysis (latest_trends)
- User projects and codex (user_projects, user_codex)
- Intelligent reasoning for political context
*/

import { getEnvVars } from '../config/env';

export interface ViztaSource {
  url: string;
  title: string;
  platform?: string;
}

export interface ViztaResponse {
  success: boolean;
  response: {
    message: string;
    agent: string;
    type?: string;
    sources?: ViztaSource[];
    c1_response?: any; // Generative UI components (charts, visualizations)
    timestamp?: string;
  };
  conversationId?: string;
  error?: string;
}

export interface ViztaRequestOptions {
  message: string;
  sessionId?: string;
  useGenerativeUI?: boolean;
}

/**
 * Get a chat response from Vizta AI agent
 * Vizta has access to:
 * - Social media tools (Twitter/X search, profiles, trends)
 * - Web search (Perplexity)
 * - User data (projects, codex, decisions)
 * - Political analysis and reasoning
 * 
 * @param message - The user's message
 * @param sessionId - Optional session ID for conversation continuity
 * @param useGenerativeUI - Whether to enable generative UI (charts, visualizations)
 * @returns Vizta's response with message and optional sources
 */
/**
 * Try to connect to a URL with timeout
 */
const tryConnection = async (url: string, timeout: number = 3000): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${url}/api/vizta-chat/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
};

export const getViztaChatResponse = async (
  message: string,
  sessionId?: string,
  useGenerativeUI: boolean = false
): Promise<ViztaResponse> => {
  const envVars = getEnvVars();
  const { EXTRACTORW_URL, BEARER_TOKEN } = envVars;
  const FALLBACK_URL = 'https://server.standatpd.com';
  
  if (!BEARER_TOKEN) {
    throw new Error('BEARER_TOKEN no configurado en variables de entorno');
  }

  // Determine which URL to use (with fallback logic)
  let activeUrl = EXTRACTORW_URL;
  
  // If using local URL, test connection first
  if (EXTRACTORW_URL?.includes('192.168.1')) {
    console.log('🔍 Verificando conexión a servidor local...');
    const isLocalAvailable = await tryConnection(EXTRACTORW_URL, 2000);
    
    if (!isLocalAvailable) {
      console.log('⚠️ Servidor local no disponible, usando producción');
      activeUrl = FALLBACK_URL;
    } else {
      console.log('✅ Conectado a servidor local');
    }
  }

  try {
    console.log(`🤖 Enviando mensaje a Vizta (${activeUrl}): "${message.substring(0, 50)}..."`);
    
    const finalSessionId = sessionId || `mobile_chat_${Date.now()}`;
    
    const response = await fetch(`${activeUrl}/api/vizta-chat/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BEARER_TOKEN}`
      },
      body: JSON.stringify({
        message,
        sessionId: finalSessionId,
        useGenerativeUI
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Vizta error ${response.status}:`, errorText);
      
      // If local failed and we haven't tried production yet, try fallback
      if (activeUrl !== FALLBACK_URL) {
        console.log('🔄 Reintentando con servidor de producción...');
        return getViztaChatResponse(message, sessionId, useGenerativeUI);
      }
      
      throw new Error(`Vizta respondió con error ${response.status}: ${errorText}`);
    }

    const data: ViztaResponse = await response.json();
    
    console.log(`✅ Respuesta de Vizta recibida (${data.response?.type || 'chat_response'})`);
    
    // Si hay fuentes, logearlas
    if (data.response?.sources && data.response.sources.length > 0) {
      console.log(`📚 Fuentes incluidas: ${data.response.sources.length}`);
    }

    return data;
    
  } catch (error) {
    console.error('❌ Error comunicando con Vizta:', error);
    
    // Re-lanzar con mensaje más descriptivo
    if (error instanceof Error) {
      throw new Error(`No se pudo conectar con Vizta: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Get available Vizta tools and capabilities
 * Useful for showing users what Vizta can do
 */
export const getViztaTools = async (): Promise<any> => {
  const { EXTRACTORW_URL, BEARER_TOKEN } = getEnvVars();
  
  try {
    const response = await fetch(`${EXTRACTORW_URL}/api/vizta-chat/tools`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo herramientas: ${response.status}`);
    }

    return await response.json();
    
  } catch (error) {
    console.error('Error obteniendo herramientas de Vizta:', error);
    return null;
  }
};

/**
 * Check Vizta service health
 */
export const checkViztaHealth = async (): Promise<boolean> => {
  const { EXTRACTORW_URL, BEARER_TOKEN } = getEnvVars();
  
  try {
    const response = await fetch(`${EXTRACTORW_URL}/api/vizta-chat/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    return response.ok;
    
  } catch (error) {
    console.error('Error verificando salud de Vizta:', error);
    return false;
  }
};

