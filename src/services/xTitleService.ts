import { getOpenAITextResponse } from '../api/chat-service';

const titleCache = new Map<string, string>();

interface GenerateXTitleParams {
  text: string;
  author?: string | null;
  url?: string;
}

function sanitizeTitle(raw: string, maxLength = 80): string {
  if (!raw) {
    return '';
  }

  let title = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) || '';

  title = title
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/#[^\s]+/g, '')
    .replace(/@[^\s]+/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (title.endsWith('.')) {
    title = title.slice(0, -1);
  }

  if (title.length > maxLength) {
    title = `${title.slice(0, maxLength - 1).trim()}…`;
  }

  if (!title) {
    return '';
  }

  // Sentence case
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export async function generateXTitleAI({
  text,
  author,
  url,
}: GenerateXTitleParams): Promise<string | null> {
  const trimmedText = text?.trim();
  if (!trimmedText) {
    return null;
  }

  const cacheKey = `${url ?? ''}|${trimmedText}`;
  if (titleCache.has(cacheKey)) {
    return titleCache.get(cacheKey) ?? null;
  }

  const systemPrompt = 'Eres un editor creativo que escribe titulares cortos y atractivos para tweets de X/Twitter.';
  const userPrompt = `Genera un solo titular conciso (máximo 80 caracteres) para el siguiente tweet.

Requisitos:
- Mantén el idioma original del tweet.
- No repitas hashtags, menciones, emojis ni URLs.
- Usa estilo periodístico claro, en una sola frase.
- Si hay un autor, utilízalo como contexto solamente.
- Captura la idea principal o noticia del tweet.

Autor: ${author ?? 'desconocido'}
Tweet: ${trimmedText}`;

  try {
    const response = await getOpenAITextResponse(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.4,
        maxTokens: 120,
        model: 'gpt-4o-mini',
      },
    );

    const sanitized = sanitizeTitle(response.content);
    if (sanitized) {
      titleCache.set(cacheKey, sanitized);
      return sanitized;
    }
  } catch (error) {
    console.error('AI title generation failed for X:', error);
  }

  return null;
}

