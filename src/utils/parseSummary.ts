const BULLET_REGEX = /^\s*[•\-\*]?\s*/;
const TLDR_REGEX = /^\s*(?:TL;?DR:?\s*)/i;

export interface ParsedSummary {
  bullets: Array<{ text: string; icon?: string; emphasis?: string }>;
  tldr?: string;
}

const ICON_MAP: Record<string, string> = {
  simplificado: '🛠️',
  simplificada: '🛠️',
  simplificadas: '🛠️',
  accurate: '✅',
  preciso: '✅',
  precisa: '✅',
  automatizado: '✔',
  automatizada: '✔',
  automatizadas: '✔',
  velocidad: '⚡',
  impulso: '⚡',
  boost: '⚡',
  alerta: '⚠️',
  riesgo: '⚠️',
  ransomware: '⚠️',
  seguridad: '🛡️',
};

function pickIcon(text: string): string | undefined {
  const lower = text.toLowerCase();
  const key = Object.keys(ICON_MAP).find((candidate) => lower.includes(candidate));
  return key ? ICON_MAP[key] : undefined;
}

function splitEmphasis(text: string): { emphasis?: string; remaining: string } {
  if (!text) return { remaining: '' };
  const match = text.match(/^(.*?)([.:!?])\s*(.*)$/);
  if (!match) {
    return { remaining: text.trim() };
  }
  const [ , firstSentence, punctuation, rest ] = match;
  if (!firstSentence) {
    return { remaining: text.trim() };
  }
  return {
    emphasis: `${firstSentence.trim()}${punctuation}`,
    remaining: rest.trim(),
  };
}

export function parseSummary(summary?: string | null): ParsedSummary {
  if (!summary) {
    return { bullets: [] };
  }

  const lines = summary.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const bullets: ParsedSummary['bullets'] = [];
  let tldr: string | undefined;

  lines.forEach((line) => {
    if (TLDR_REGEX.test(line)) {
      const cleaned = line.replace(TLDR_REGEX, '').trim();
      if (cleaned) {
        tldr = cleaned;
      }
      return;
    }

    const cleanedLine = line.replace(BULLET_REGEX, '').trim();
    if (!cleanedLine) return;

    // Filtrar bullets redundantes que solo contengan "Resumen:" o similares
    const normalizedLine = cleanedLine.toLowerCase().trim();
    const isRedundantSummary = /^resumen[:.]?\s*$/.test(normalizedLine);
    if (isRedundantSummary) return;

    const { emphasis, remaining } = splitEmphasis(cleanedLine);
    
    // También filtrar si el texto completo después del split es solo "Resumen:" o similar
    const normalizedRemaining = remaining.toLowerCase().trim();
    const isRedundantRemaining = /^resumen[:.]?\s*$/.test(normalizedRemaining);
    if (isRedundantRemaining && !emphasis) return;

    bullets.push({
      text: remaining,
      icon: pickIcon(cleanedLine),
      emphasis,
    });
  });

  return { bullets, tldr };
}

