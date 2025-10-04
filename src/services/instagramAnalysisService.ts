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

  const payload: StoredInstagramAnalysis = {
    postId,
    type: media.type,
    summary,
    transcript,
    images: imageDescriptions,
    caption,
    createdAt: Date.now(),
    metadata: {
      media,
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
