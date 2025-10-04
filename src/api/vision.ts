import { getOpenAIClient } from './openai';

export async function describeImageWithVision(imageUrl: string, prompt: string): Promise<string> {
  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 400,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return '';

    if (typeof content === 'string') {
      return content.trim();
    }

    if (Array.isArray(content)) {
      const parts = content as any[];
      return parts
        .map((piece: any) => (typeof piece === 'string' ? piece : piece?.text ?? ''))
        .filter(Boolean)
        .join(' ')
        .trim();
    }

    return '';
  } catch (error) {
    console.error('Vision API error:', error);
    throw error;
  }
}
