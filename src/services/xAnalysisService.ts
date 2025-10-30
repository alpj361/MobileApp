import { fetchXComplete } from './xCompleteService';
import { XMediaType } from './xMediaService';
import { getOpenAITextResponse } from '../api/chat-service';
import { extractXPostId } from '../utils/x';
import {
  loadXAnalysis,
  saveXAnalysis,
  StoredXAnalysis,
} from '../storage/xAnalysisRepo';

interface AnalyzeOptions {
  force?: boolean;
}

interface AnalysisInsights {
  topic?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

interface InsightParams {
  text?: string;
  summary?: string;
  transcript?: string;
  type: XMediaType;
}

/**
 * ✅ OPTIMIZADO: Analizar post de X usando el servicio unificado
 * Ya NO hace llamadas duplicadas - todo viene de fetchXComplete()
 */
export async function analyzeXPost(
  url: string,
  text: string | undefined,
  options: AnalyzeOptions = {},
): Promise<StoredXAnalysis> {
  console.log('[X Analysis] Starting analysis for:', url);
  
  const postId = extractXPostId(url);
  if (!postId) {
    console.error('[X Analysis] Failed to extract post ID from:', url);
    throw new Error('No se pudo determinar el ID del post de X');
  }

  console.log('[X Analysis] Post ID:', postId);

  if (!options.force) {
    const cached = await loadXAnalysis(postId);
    if (cached) {
      console.log('[X Analysis] Using cached analysis for:', postId);
      return cached;
    }
  }

  const startTime = Date.now();
  
  try {
    // ✅ UNA SOLA llamada que obtiene TODO (media, comentarios, transcripción/visión)
    console.log('[X Analysis] Fetching complete data from unified service...');
    const completeData = await fetchXComplete(url);
    
    console.log('[X Analysis] ✅ Complete data received');
    console.log('[X Analysis] Media type:', completeData.media.type);
    console.log('[X Analysis] Has transcription:', !!completeData.transcription);
    console.log('[X Analysis] Has vision:', !!completeData.vision);
    console.log('[X Analysis] Comments count:', completeData.comments.length);

    // ✅ Ya tenemos transcripción O visión del backend (ExtractorT ya lo hizo)
    const transcript = completeData.transcription || completeData.vision || undefined;
    const tweetText = text || completeData.tweet.text;

    // Solo generar resumen e insights (NO volver a transcribir/analizar)
    console.log('[X Analysis] Generating summary...');
    const summary = await summarizeXPost({
      text: tweetText,
      transcript,
      type: completeData.media.type,
    });
    console.log('[X Analysis] Summary completed:', summary.length, 'chars');

    console.log('[X Analysis] Deriving insights...');
    const insights = await deriveXInsights({
      text: tweetText,
      summary,
      transcript,
      type: completeData.media.type,
    });
    console.log('[X Analysis] Insights completed - topic:', insights.topic, 'sentiment:', insights.sentiment);

    const processingTime = Date.now() - startTime;
    console.log('[X Analysis] Total processing time:', processingTime, 'ms');

    const payload: StoredXAnalysis = {
      postId,
      type: completeData.media.type,
      summary,
      transcript,
      images: undefined, // Ya no usamos describeXImages - viene de vision_analysis
      text: tweetText,
      topic: insights.topic,
      sentiment: insights.sentiment ?? 'neutral',
      createdAt: Date.now(),
      metadata: {
        processingTime,
        videoSize: completeData.media.size,
        imageCount: completeData.media.urls?.length || (completeData.media.url ? 1 : 0),
        media: completeData.media,
        insights,
        metrics: completeData.metrics,
        commentsCount: completeData.comments.length,
      },
    };

    console.log('[X Analysis] Saving analysis to cache...');
    await saveXAnalysis(payload);

    console.log('[X Analysis] ✅ Analysis completed successfully for:', postId);
    return payload;
    
  } catch (error) {
    console.error('[X Analysis] Error analyzing post:', error);
    throw error;
  }
}

interface SummarizeParams {
  text?: string;
  transcript?: string;
  type: XMediaType;
}

// Resumen IA
async function summarizeXPost(params: SummarizeParams): Promise<string> {
  const { text, transcript, type } = params;

  const pieces: string[] = [];
  if (text) {
    pieces.push(`Tweet original:\n${text}`);
  }
  if (transcript) {
    pieces.push(`Contenido analizado:\n${transcript}`);
  }

  if (pieces.length === 0) {
    return 'No hay contenido suficiente para generar resumen.';
  }

  const prompt = `Eres un asistente que resume tweets de X/Twitter en español claro y conciso.
Tienes la siguiente información de un tweet de tipo ${type}.

${pieces.join('\n\n')}

Genera una respuesta únicamente en este formato:
Resumen:
• Punto clave 1
• Punto clave 2
• Punto clave 3 (opcional)
TL;DR: una sola oración breve con la idea principal.

No repitas hashtags ni menciones, no inventes información. Si falta información (por ejemplo no hay transcripción), enfócate en la disponible.`;

  try {
    const response = await getOpenAITextResponse([
      { role: 'system', content: 'Eres un asistente experto en redacción en español neutro.' },
      { role: 'user', content: prompt },
    ], {
      model: 'gpt-4o-mini',
      temperature: 0.4,
      maxTokens: 400,
    });

    return (response.content || '').trim();
  } catch (error) {
    console.error('[X Analysis] Summary generation failed:', error);
    return 'Error al generar resumen.';
  }
}

// Topic + Sentiment
async function deriveXInsights(params: InsightParams): Promise<AnalysisInsights> {
  const { text, summary, transcript, type } = params;

  if (!summary && !text && !transcript) {
    return {};
  }

  const pieces: string[] = [];
  if (summary) pieces.push(`Resumen existente:\n${summary}`);
  if (text) pieces.push(`Tweet original:\n${text}`);
  if (transcript) pieces.push(`Contenido analizado:\n${transcript}`);

  const prompt = `Analiza el siguiente tweet de ${type} y responde únicamente con un JSON válido.
El JSON debe tener esta forma:
{"topic": "tema principal en español", "sentiment": "positive|negative|neutral"}

Instrucciones adicionales:
- "topic" debe ser una frase corta (máximo 6 palabras) en español neutro.
- "sentiment" debe ser exactamente "positive", "negative" o "neutral".
- Si no hay información suficiente para alguno de los campos, usa null.

Contenido para analizar:
${pieces.join('\n\n')}`;

  try {
    const response = await getOpenAITextResponse(
      [
        { role: 'system', content: 'Eres un analista de redes sociales que responde estrictamente en JSON.' },
        { role: 'user', content: prompt },
      ],
      {
        model: 'gpt-4o-mini',
        temperature: 0.2,
        maxTokens: 200,
      },
    );

    const parsed = parseInsightsResponse(response.content);
    return normalizeInsights(parsed);
  } catch (error) {
    console.warn('[X Analysis] Failed to derive insights:', error);
    return {};
  }
}

function parseInsightsResponse(raw?: string | null): Partial<AnalysisInsights> | null {
  if (!raw) return null;
  try {
    const jsonMatch = raw.match(/\{[^}]+\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function normalizeInsights(parsed: Partial<AnalysisInsights> | null): AnalysisInsights {
  if (!parsed || typeof parsed !== 'object') {
    return {};
  }
  const result: AnalysisInsights = {};
  if (typeof parsed.topic === 'string' && parsed.topic.trim()) {
    result.topic = parsed.topic.trim();
  }
  if (parsed.sentiment === 'positive' || parsed.sentiment === 'negative' || parsed.sentiment === 'neutral') {
    result.sentiment = parsed.sentiment;
  }
  return result;
}
