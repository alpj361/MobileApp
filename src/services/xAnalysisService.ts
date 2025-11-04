import { fetchXComplete } from './xCompleteService';
import { XMediaType } from './xMediaService';
import { extractXPostId } from '../utils/x';
import { getApiUrl } from '../config/backend';
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
    let summary = '';
    let insights = { topic: undefined, sentiment: 'neutral' as const };
    
    try {
      console.log('[X Analysis] Generating summary...');
      summary = await Promise.race([
        summarizeXPost({
          text: tweetText,
          transcript,
          type: completeData.media.type,
        }),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('Summary timeout')), 15000)
        )
      ]);
      console.log('[X Analysis] Summary completed:', summary.length, 'chars');
    } catch (error) {
      console.warn('[X Analysis] ⚠️ Summary generation failed or timed out, using basic text');
      // Usar el texto del tweet como fallback
      summary = tweetText ? `Tweet: ${tweetText}` : 'Contenido de X/Twitter';
    }

    try {
      console.log('[X Analysis] Deriving insights...');
      insights = await Promise.race([
        deriveXInsights({
          text: tweetText,
          summary,
          transcript,
          type: completeData.media.type,
        }),
        new Promise<{ topic: undefined; sentiment: 'neutral' }>((_, reject) => 
          setTimeout(() => reject(new Error('Insights timeout')), 15000)
        )
      ]);
      console.log('[X Analysis] Insights completed - topic:', insights.topic, 'sentiment:', insights.sentiment);
    } catch (error) {
      console.warn('[X Analysis] ⚠️ Insights generation failed or timed out, using defaults');
      insights = { topic: undefined, sentiment: 'neutral' };
    }

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
      entities: completeData.entities || [],  // ✅ Include extracted entities
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
    console.log('[X Analysis] Payload includes', payload.entities?.length || 0, 'entities');
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

// Resumen IA - Ahora llama al backend ExtractorW
async function summarizeXPost(params: SummarizeParams): Promise<string> {
  const { text, transcript, type } = params;

  if (!text && !transcript) {
    return 'No hay contenido suficiente para generar resumen.';
  }

  try {
    const url = getApiUrl('/api/x/summarize', 'extractorw');

    console.log('[X Summary] Calling backend:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        transcript,
        type,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[X Summary] Backend error - Status:', response.status);
      console.error('[X Summary] Backend error - Data:', errorData);
      return 'Error al generar resumen.';
    }

    const data = await response.json();

    if (data.success && data.summary) {
      console.log('[X Summary] Backend summary received:', data.summary.substring(0, 100));
      return data.summary;
    }

    return 'Error al generar resumen.';
  } catch (error) {
    console.error('[X Summary] Failed to generate summary:', error);
    return 'Error al generar resumen.';
  }
}

// Topic + Sentiment - Ahora llama al backend ExtractorW
async function deriveXInsights(params: InsightParams): Promise<AnalysisInsights> {
  const { text, summary, transcript, type } = params;

  if (!summary && !text && !transcript) {
    return {};
  }

  try {
    const url = getApiUrl('/api/x/analyze', 'extractorw');

    console.log('[X Analysis] Calling backend:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        summary,
        transcript,
        type,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[X Analysis] Backend error - Status:', response.status);
      console.error('[X Analysis] Backend error - Data:', errorData);
      return {};
    }

    const data = await response.json();

    if (data.success && data.insights) {
      console.log('[X Analysis] Backend insights:', data.insights);
      return data.insights;
    }

    return {};
  } catch (error) {
    console.warn('[X Analysis] Failed to derive insights:', error);
    return {};
  }
}

// Las funciones parseInsightsResponse y normalizeInsights
// ahora se manejan en el backend (ExtractorW)
