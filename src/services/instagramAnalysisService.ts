import * as FileSystem from 'expo-file-system';
import { fetchInstagramMedia, InstagramMedia, InstagramMediaType } from './instagramMediaService';
import { transcribeAudio } from '../api/transcribe-audio';
import { describeImageWithVision } from '../api/vision';
import { getOpenAITextResponse } from '../api/chat-service';
import { extractInstagramPostId } from '../utils/instagram';
import {
  loadInstagramAnalysis,
  saveInstagramAnalysis,
  StoredInstagramAnalysis,
} from '../storage/instagramAnalysisRepo';

interface AnalyzeOptions {
  force?: boolean;
}

interface AnalysisInsights {
  topic?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

interface InsightParams {
  caption?: string;
  summary: string;
  transcript?: string;
  images?: Array<{ url: string; description: string }>;
  type: InstagramMediaType;
}

export async function analyzeInstagramPost(
  url: string,
  caption: string | undefined,
  options: AnalyzeOptions = {},
): Promise<StoredInstagramAnalysis> {
  const postId = extractInstagramPostId(url);
  if (!postId) {
    throw new Error('No se pudo determinar el ID del post de Instagram');
  }

  if (!options.force) {
    const cached = await loadInstagramAnalysis(postId);
    if (cached) {
      return cached;
    }
  }

  const media = await fetchInstagramMedia(url);

  let transcript: string | undefined;
  let imageDescriptions: Array<{ url: string; description: string }> | undefined;

  if (media.type === 'video') {
    transcript = await transcribeInstagramVideo(media, postId);
  } else if (media.type === 'image' || media.type === 'carousel') {
    imageDescriptions = await describeInstagramImages(media);
  }

  const summary = await summarizeInstagramPost({
    caption,
    transcript,
    images: imageDescriptions,
    type: media.type,
  });

  const insights = await deriveInstagramInsights({
    caption,
    summary,
    transcript,
    images: imageDescriptions,
    type: media.type,
  });

  const payload: StoredInstagramAnalysis = {
    postId,
    type: media.type,
    summary,
    transcript,
    images: imageDescriptions,
    caption,
    topic: insights.topic,
    sentiment: insights.sentiment ?? 'neutral',
    createdAt: Date.now(),
    metadata: {
      media,
      insights,
    },
  };

  await saveInstagramAnalysis(payload);
  return payload;
}

async function transcribeInstagramVideo(media: InstagramMedia, postId: string): Promise<string | undefined> {
  const sourceUrl = media.audioUrl || media.videoUrl;
  if (!sourceUrl) {
    console.warn('Instagram media has no audio/video URL for transcription');
    return undefined;
  }

  const extension = guessExtension(sourceUrl);
  const fileUri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${postId}-${Date.now()}.${extension}`;

  const download = await FileSystem.downloadAsync(sourceUrl, fileUri);
  try {
    const mimeType = extension === 'mp3' ? 'audio/mpeg' : extension === 'mp4' ? 'video/mp4' : 'audio/m4a';
    const fileName = `instagram-${postId}.${extension}`;
    const rawTranscript = await transcribeAudio(download.uri, {
      mimeType,
      fileName,
      language: 'auto',
    });
    return normalizeTranscript(rawTranscript);
  } finally {
    try {
      await FileSystem.deleteAsync(download.uri, { idempotent: true });
    } catch (error) {
      console.warn('Failed to clean up downloaded media file:', error);
    }
  }
}

async function describeInstagramImages(media: InstagramMedia): Promise<Array<{ url: string; description: string }>> {
  const images = media.images ?? [];
  const selected = images.slice(0, 3);
  const results: Array<{ url: string; description: string }> = [];

  for (const imageUrl of selected) {
    try {
      const description = await describeImageWithVision(
        imageUrl,
        'Describe objetivamente esta imagen de Instagram en español. Menciona personas, objetos, texto visible y la atmósfera general. Sé breve (2-3 frases).',
      );
      if (description) {
        results.push({ url: imageUrl, description });
      }
    } catch (error) {
      console.warn('Vision analysis failed for image:', error);
    }
  }

  return results;
}

interface SummarizeParams {
  caption?: string;
  transcript?: string;
  images?: Array<{ url: string; description: string }>;
  type: InstagramMediaType;
}

async function summarizeInstagramPost(params: SummarizeParams): Promise<string> {
  const { caption, transcript, images, type } = params;

  const pieces: string[] = [];
  if (caption) {
    pieces.push(`Caption original:\n${caption}`);
  }
  if (transcript) {
    pieces.push(`Transcripción del audio:\n${transcript}`);
  }
  if (images && images.length > 0) {
    const visionText = images
      .map((image, idx) => `Imagen ${idx + 1}: ${image.description}`)
      .join('\n');
    pieces.push(`Descripción visual:\n${visionText}`);
  }

  const prompt = `Eres un asistente que resume publicaciones de Instagram en español claro y conciso.
Tienes la siguiente información de un post de tipo ${type}.

${pieces.join('\n\n')}

Genera una respuesta únicamente en este formato:
Resumen:
• Punto clave 1
• Punto clave 2
• Punto clave 3 (opcional)
TL;DR: una sola oración breve con la idea principal.

No repitas hashtags ni menciones, no inventes información. Si falta información (por ejemplo no hay transcripción), enfócate en la disponible.`;

  const response = await getOpenAITextResponse([
    { role: 'system', content: 'Eres un asistente experto en redacción en español neutro.' },
    { role: 'user', content: prompt },
  ], {
    model: 'gpt-4o-mini',
    temperature: 0.4,
    maxTokens: 400,
  });

  return (response.content || '').trim();
}

async function deriveInstagramInsights(params: InsightParams): Promise<AnalysisInsights> {
  const { caption, summary, transcript, images, type } = params;

  if (!summary && !caption && !transcript && (!images || images.length === 0)) {
    return {};
  }

  const pieces: string[] = [];
  if (summary) pieces.push(`Resumen existente:\n${summary}`);
  if (caption) pieces.push(`Caption original:\n${caption}`);
  if (transcript) pieces.push(`Transcripción:\n${transcript}`);
  if (images && images.length > 0) {
    const imageText = images.map((image, idx) => `Imagen ${idx + 1}: ${image.description}`).join('\n');
    pieces.push(`Descripción visual:\n${imageText}`);
  }

  const prompt = `Analiza la siguiente publicación de ${type} y responde únicamente con un JSON válido.
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
    console.warn('Failed to derive Instagram insights:', error);
    return {};
  }
}

function parseInsightsResponse(raw?: string | null): Partial<AnalysisInsights> | null {
  if (!raw) return null;

  const cleaned = raw
    .replace(/```json/gi, '```')
    .replace(/```/g, '')
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch (error) {
    console.warn('Unable to parse insights JSON:', error);
    return null;
  }
}

function normalizeInsights(data: Partial<AnalysisInsights> | null): AnalysisInsights {
  if (!data) return {};

  const topic = typeof data.topic === 'string' ? data.topic.trim() : undefined;
  const sentimentRaw = typeof data.sentiment === 'string' ? data.sentiment.trim().toLowerCase() : undefined;

  const sentiment = (() => {
    if (!sentimentRaw) return undefined;
    if (['positive', 'positivo', 'positiva'].includes(sentimentRaw)) return 'positive';
    if (['negative', 'negativo', 'negativa'].includes(sentimentRaw)) return 'negative';
    if (['neutral', 'neutro', 'neutra'].includes(sentimentRaw)) return 'neutral';
    return undefined;
  })();

  return {
    topic: topic && topic.toLowerCase() !== 'null' && topic.toLowerCase() !== 'undefined' ? topic : undefined,
    sentiment,
  };
}

function guessExtension(url: string): string {
  const match = url.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  if (match) {
    return match[1].toLowerCase();
  }
  return 'm4a';
}

function normalizeTranscript(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\[.*?\]/g, '')
    .trim();
}
