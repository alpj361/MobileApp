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

export interface ViztaContextReference {
  id: string;
  type: 'codex' | 'project' | 'file';
  note?: string;
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
  sources?: ViztaSource[];
  attachments?: Array<Record<string, any>>;
  metadata?: Record<string, any>;
  error?: string;
}

export interface ViztaRequestConfig {
  useGenerativeUI?: boolean;
  mode?: 'chat' | 'agentic';
  contextRefs?: ViztaContextReference[];
  codexItemIds?: string[];
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

export const getViztaChatResponse = async (
  message: string,
  sessionId?: string,
  configOrUseGenerative?: boolean | ViztaRequestConfig
): Promise<ViztaResponse> => {
  const { EXTRACTORW_URL, BEARER_TOKEN } = getEnvVars();
  const isBool = typeof configOrUseGenerative === 'boolean';
  const cfg = (configOrUseGenerative && typeof configOrUseGenerative === 'object')
    ? (configOrUseGenerative as ViztaRequestConfig)
    : {} as ViztaRequestConfig;

  const useGenerativeUI = isBool ? (configOrUseGenerative as boolean) : (cfg.useGenerativeUI ?? false);
  const mode = isBool ? 'chat' : (cfg.mode ?? 'chat');
  const contextRefs = isBool ? [] : (cfg.contextRefs ?? []);
  const codexItemIds = isBool ? [] : (cfg.codexItemIds ?? []);
  
  if (!EXTRACTORW_URL) {
    throw new Error('EXTRACTORW_URL no configurada en variables de entorno');
  }

  if (!BEARER_TOKEN) {
    throw new Error('BEARER_TOKEN no configurado en variables de entorno');
  }

  try {
    console.log(`🤖 Enviando mensaje a Vizta (${EXTRACTORW_URL}): "${message.substring(0, 50)}..."`);
    
    const finalSessionId = sessionId || `mobile_chat_${Date.now()}`;
    const payload: Record<string, any> = {
      message,
      sessionId: finalSessionId,
      useGenerativeUI,
      mode
    };

    if (contextRefs.length > 0) {
      payload.context_refs = contextRefs;
    }

    if (Array.isArray(codexItemIds) && codexItemIds.length > 0) {
      payload.codex_item_ids = codexItemIds;
    }
    
    const response = await fetch(`${EXTRACTORW_URL}/api/vizta-chat/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BEARER_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Vizta error ${response.status}:`, errorText);
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
