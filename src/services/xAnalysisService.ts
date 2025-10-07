import { fetchXMedia, XMediaType } from './xMediaService';
import { describeImageWithVision } from '../api/vision';
import { getOpenAITextResponse } from '../api/chat-service';
import { extractXPostId } from '../utils/x';
import {
  loadXAnalysis,
  saveXAnalysis,
  StoredXAnalysis,
} from '../storage/xAnalysisRepo';

const BASE_URL = process.env.EXPO_PUBLIC_EXTRACTORW_URL ?? 'https://server.standatpd.com';
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGES = 4;
const ANALYSIS_TIMEOUT = 60000; // 60s

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
  images?: Array<{ url: string; description: string }>;
  type: XMediaType;
}

export async function analyzeXPost(
  url: string,
  text: string | undefined,
  options: AnalyzeOptions = {},
): Promise<StoredXAnalysis> {
  const postId = extractXPostId(url);
  if (!postId) {
    throw new Error('No se pudo determinar el ID del post de X');
  }

  if (!options.force) {
    const cached = await loadXAnalysis(postId);
    if (cached) {
      return cached;
    }
  }

  const startTime = Date.now();

  // Fetch media info
  const media = await fetchXMedia(url);

  let transcript: string | undefined;
  let imageDescriptions: Array<{ url: string; description: string }> | undefined;

  // 1. TRANSCRIPCIÓN (Prioridad 1)
  if (media.type === 'video') {
    transcript = await transcribeXVideo(url, media);
  } 
  // 4. VISION para imágenes (Prioridad 4)
  else if (media.type === 'image') {
    imageDescriptions = await describeXImages(media);
  }

  // 2. RESUMEN IA (Prioridad 2)
  const summary = await summarizeXPost({
    text,
    transcript,
    images: imageDescriptions,
    type: media.type,
  });

  // 3. TOPIC + SENTIMENT (Prioridad 3)
  const insights = await deriveXInsights({
    text,
    summary,
    transcript,
    images: imageDescriptions,
    type: media.type,
  });

  const processingTime = Date.now() - startTime;

  const payload: StoredXAnalysis = {
    postId,
    type: media.type,
    summary,
    transcript,
    images: imageDescriptions,
    text: text || '',
    topic: insights.topic,
    sentiment: insights.sentiment ?? 'neutral',
    createdAt: Date.now(),
    metadata: {
      processingTime,
      videoSize: media.size,
      imageCount: media.urls?.length || (media.url ? 1 : 0),
      media,
      insights,
    },
  };

  await saveXAnalysis(payload);
  return payload;
}

// PRIORIDAD 1: Transcripción de video usando /twitter/process
async function transcribeXVideo(url: string, media: any): Promise<string | undefined> {
  try {
    // Check video size limit
    if (media.size && media.size > MAX_VIDEO_SIZE) {
      console.warn(`[X Analysis] Video too large: ${media.size} bytes`);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT);

    try {
      const response = await fetch(`${BASE_URL}/api/x/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[X Analysis] Twitter process failed: ${response.status}`);
        return undefined;
      }

      const data = await response.json();
      
      if (data.transcription) {
        return normalizeTranscript(data.transcription);
      }

      return undefined;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.warn('[X Analysis] Transcription timed out');
      } else {
        console.error('[X Analysis] Transcription error:', error);
      }
      return undefined;
    }
  } catch (error) {
    console.error('[X Analysis] Error in transcribeXVideo:', error);
    return undefined;
  }
}

// PRIORIDAD 4: Vision para imágenes
async function describeXImages(media: any): Promise<Array<{ url: string; description: string }>> {
  const imageUrls: string[] = media.urls || (media.url ? [media.url] : []);
  
  if (imageUrls.length === 0) {
    return [];
  }

  // Limit to MAX_IMAGES
  const limitedUrls = imageUrls.slice(0, MAX_IMAGES);
  const descriptions: Array<{ url: string; description: string }> = [];

  for (const imageUrl of limitedUrls) {
    try {
      const description = await describeImageWithVision(imageUrl, {
        detail: 'low',
        language: 'auto',
      });
      if (description) {
        descriptions.push({ url: imageUrl, description });
      }
    } catch (error) {
      console.warn(`[X Analysis] Failed to describe image ${imageUrl}:`, error);
    }
  }

  return descriptions;
}

interface SummarizeParams {
  text?: string;
  transcript?: string;
  images?: Array<{ url: string; description: string }>;
  type: XMediaType;
}

// PRIORIDAD 2: Resumen IA
async function summarizeXPost(params: SummarizeParams): Promise<string> {
  const { text, transcript, images, type } = params;

  const pieces: string[] = [];
  if (text) {
    pieces.push(`Tweet original:\n${text}`);
  }
  if (transcript) {
    pieces.push(`Transcripción del video:\n${transcript}`);
  }
  if (images && images.length > 0) {
    const visionText = images
      .map((image, idx) => `Imagen ${idx + 1}: ${image.description}`)
      .join('\n');
    pieces.push(`Descripción visual:\n${visionText}`);
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

// PRIORIDAD 3: Topic + Sentiment
async function deriveXInsights(params: InsightParams): Promise<AnalysisInsights> {
  const { text, summary, transcript, images, type } = params;

  if (!summary && !text && !transcript && (!images || images.length === 0)) {
    return {};
  }

  const pieces: string[] = [];
  if (summary) pieces.push(`Resumen existente:\n${summary}`);
  if (text) pieces.push(`Tweet original:\n${text}`);
  if (transcript) pieces.push(`Transcripción:\n${transcript}`);
  if (images && images.length > 0) {
    const imageText = images.map((image, idx) => `Imagen ${idx + 1}: ${image.description}`).join('\n');
    pieces.push(`Descripción visual:\n${imageText}`);
  }

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

function normalizeTranscript(raw: string): string {
  return raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

