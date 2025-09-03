export interface LinkData {
  url: string;
  title: string;
  description: string;
  image?: string;
  favicon?: string;
  type: 'link' | 'tweet' | 'video' | 'article' | 'instagram' | 'tiktok';
  domain: string;
  timestamp: number;
  platform?: 'instagram' | 'tiktok' | 'twitter' | 'youtube' | 'generic';
  author?: string;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
}

// Configuración de plataformas sociales con APIs oEmbed
const SOCIAL_PLATFORMS = {
  instagram: {
    domains: ['instagram.com', 'instagr.am'],
    oembed: 'https://api.instagram.com/oembed',
    fallback: 'https://www.instagram.com/api/v1',
    type: 'instagram' as const,
    icon: '📷'
  },
  tiktok: {
    domains: ['tiktok.com', 'vm.tiktok.com'],
    oembed: 'https://www.tiktok.com/oembed',
    fallback: 'https://www.tiktok.com/api',
    type: 'video' as const,
    icon: '🎵'
  },
  twitter: {
    domains: ['twitter.com', 'x.com', 't.co'],
    oembed: 'https://publish.twitter.com/oembed',
    fallback: 'https://api.twitter.com/2',
    type: 'tweet' as const,
    icon: '🐦'
  },
  youtube: {
    domains: ['youtube.com', 'youtu.be'],
    oembed: 'https://www.youtube.com/oembed',
    fallback: 'https://www.youtube.com/oembed',
    type: 'video' as const,
    icon: '▶️'
  }
};

// Cache local para evitar re-scraping
const linkCache = new Map<string, { data: LinkData; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora

/**
 * Detecta la plataforma social basada en la URL
 */
export const detectSocialPlatform = (url: string): keyof typeof SOCIAL_PLATFORMS | null => {
  const domain = new URL(url).hostname.toLowerCase();
  
  for (const [platform, config] of Object.entries(SOCIAL_PLATFORMS)) {
    if (config.domains.some(d => domain.includes(d))) {
      return platform as keyof typeof SOCIAL_PLATFORMS;
    }
  }
  
  return null;
};

/**
 * Decodifica HTML entities a texto legible
 */
const decodeHtmlEntities = (text: string): string => {
  // Fallback para React Native
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`')
    .replace(/&#x3D;/g, '=')
    .replace(/&#x2B;/g, '+')
    .replace(/&#xE1;/g, 'á')
    .replace(/&#xE9;/g, 'é')
    .replace(/&#xED;/g, 'í')
    .replace(/&#xF3;/g, 'ó')
    .replace(/&#xFA;/g, 'ú')
    .replace(/&#xF1;/g, 'ñ')
    .replace(/&#x270A;/g, '✊')
    .replace(/&#x1F3FB;/g, '🏻')
    .replace(/&#x1F49C;/g, '💜')
    .replace(/&#xF1OS;/g, 'ños');
};

/**
 * Obtiene datos oEmbed de la plataforma social
 */
const getOEmbedData = async (url: string, platform: keyof typeof SOCIAL_PLATFORMS): Promise<any | null> => {
  try {
    const config = SOCIAL_PLATFORMS[platform];
    const response = await fetch(`${config.oembed}?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.log(`oEmbed failed for ${platform}:`, error);
    return null;
  }
};

/**
 * Parser especializado para Instagram
 */
const parseInstagramHTML = (html: string, url: string): Partial<LinkData> => {
  const metadata: Partial<LinkData> = {};
  
  // Extraer título/descripción
  const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/) ||
                    html.match(/<meta name="twitter:title" content="([^"]*)"/);
  if (titleMatch) {
    metadata.title = decodeHtmlEntities(titleMatch[1].trim());
  }
  
  // Extraer descripción
  const descMatch = html.match(/<meta property="og:description" content="([^"]*)"/) ||
                   html.match(/<meta name="twitter:description" content="([^"]*)"/);
  if (descMatch) {
    metadata.description = decodeHtmlEntities(descMatch[1].trim());
  }
  
  // Extraer imagen
  const imageMatch = html.match(/<meta property="og:image" content="([^"]*)"/) ||
                    html.match(/<meta name="twitter:image" content="([^"]*)"/);
  if (imageMatch) {
    metadata.image = imageMatch[1].trim();
  }
  
  // Extraer autor
  const authorMatch = html.match(/<meta property="og:site_name" content="([^"]*)"/);
  if (authorMatch) {
    metadata.author = decodeHtmlEntities(authorMatch[1].trim());
  }
  
  return metadata;
};

/**
 * Parser especializado para TikTok
 */
const parseTikTokHTML = (html: string, url: string): Partial<LinkData> => {
  const metadata: Partial<LinkData> = {};
  
  // Extraer título
  const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/);
  if (titleMatch) {
    metadata.title = decodeHtmlEntities(titleMatch[1].trim());
  }
  
  // Extraer descripción
  const descMatch = html.match(/<meta property="og:description" content="([^"]*)"/);
  if (descMatch) {
    metadata.description = decodeHtmlEntities(descMatch[1].trim());
  }
  
  // Extraer imagen
  const imageMatch = html.match(/<meta property="og:image" content="([^"]*)"/);
  if (imageMatch) {
    metadata.image = imageMatch[1].trim();
  }
  
  // Extraer autor
  const authorMatch = html.match(/<meta property="og:site_name" content="([^"]*)"/);
  if (authorMatch) {
    metadata.author = decodeHtmlEntities(authorMatch[1].trim());
  }
  
  return metadata;
};

/**
 * Parser especializado para Twitter
 */
const parseTwitterHTML = (html: string, url: string): Partial<LinkData> => {
  const metadata: Partial<LinkData> = {};
  
  // Extraer título
  const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/) ||
                    html.match(/<meta name="twitter:title" content="([^"]*)"/);
  if (titleMatch) {
    metadata.title = decodeHtmlEntities(titleMatch[1].trim());
  }
  
  // Extraer descripción
  const descMatch = html.match(/<meta property="og:description" content="([^"]*)"/) ||
                   html.match(/<meta name="twitter:description" content="([^"]*)"/);
  if (descMatch) {
    metadata.description = decodeHtmlEntities(descMatch[1].trim());
  }
  
  // Extraer imagen
  const imageMatch = html.match(/<meta property="og:image" content="([^"]*)"/) ||
                    html.match(/<meta name="twitter:image" content="([^"]*)"/);
  if (imageMatch) {
    metadata.image = imageMatch[1].trim();
  }
  
  // Extraer autor
  const authorMatch = html.match(/<meta property="og:site_name" content="([^"]*)"/);
  if (authorMatch) {
    metadata.author = decodeHtmlEntities(authorMatch[1].trim());
  }
  
  return metadata;
};

/**
 * Parser genérico para otras páginas
 */
const parseGenericHTML = (html: string, url: string): Partial<LinkData> => {
  const metadata: Partial<LinkData> = {};
  
  // Extraer título
  const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/) ||
                    html.match(/<meta name="twitter:title" content="([^"]*)"/) ||
                    html.match(/<title>([^<]*)<\/title>/);
  if (titleMatch) {
    metadata.title = decodeHtmlEntities(titleMatch[1].trim());
  }
  
  // Extraer descripción
  const descMatch = html.match(/<meta property="og:description" content="([^"]*)"/) ||
                   html.match(/<meta name="twitter:description" content="([^"]*)"/) ||
                   html.match(/<meta name="description" content="([^"]*)"/);
  if (descMatch) {
    metadata.description = decodeHtmlEntities(descMatch[1].trim());
  }
  
  // Extraer imagen
  const imageMatch = html.match(/<meta property="og:image" content="([^"]*)"/) ||
                    html.match(/<meta name="twitter:image" content="([^"]*)"/);
  if (imageMatch) {
    let imageUrl = imageMatch[1].trim();
    if (imageUrl.startsWith('/')) {
      const baseUrl = new URL(url);
      imageUrl = `${baseUrl.protocol}//${baseUrl.host}${imageUrl}`;
    }
    metadata.image = imageUrl;
  }
  
  return metadata;
};

/**
 * Extrae URLs del texto usando regex optimizado
 */
export const extractLinksFromText = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
};

/**
 * Determina el tipo de link basado en la URL y plataforma
 */
const getLinkType = (url: string, platform?: keyof typeof SOCIAL_PLATFORMS): LinkData['type'] => {
  if (platform) {
    return SOCIAL_PLATFORMS[platform].type;
  }
  
  const domain = new URL(url).hostname.toLowerCase();
  
  if (domain.includes('twitter.com') || domain.includes('x.com')) {
    return 'tweet';
  }
  if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
    return 'video';
  }
  if (domain.includes('medium.com') || domain.includes('substack.com') || 
      domain.includes('blog') || domain.includes('news')) {
    return 'article';
  }
  
  return 'link';
};

/**
 * Extrae el dominio de la URL
 */
const getDomain = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return 'Unknown';
  }
};

/**
 * Procesa un link con prioridad a oEmbed para redes sociales
 */
export const processLink = async (url: string): Promise<LinkData> => {
  // Verificar cache primero
  const cached = linkCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    // Validar URL
    new URL(url);
    
    // Detectar plataforma social
    const platform = detectSocialPlatform(url);
    
    let metadata: Partial<LinkData> = {};
    let oembedData: any = null;
    
    // Prioridad 1: oEmbed para redes sociales
    if (platform) {
      oembedData = await getOEmbedData(url, platform);
      if (oembedData) {
        metadata = {
          title: oembedData.title || oembedData.author_name,
          description: oembedData.description || oembedData.author_name,
          image: oembedData.thumbnail_url || oembedData.thumbnail,
          author: oembedData.author_name || oembedData.author_url,
        };
      }
    }
    
    // Prioridad 2: Scraping HTML si oEmbed falló o no hay plataforma
    if (!oembedData || Object.keys(metadata).length === 0) {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const html = await response.text();
      
      if (platform) {
        // Parser especializado por plataforma
        switch (platform) {
          case 'instagram':
            metadata = parseInstagramHTML(html, url);
            break;
          case 'tiktok':
            metadata = parseTikTokHTML(html, url);
            break;
          case 'twitter':
            metadata = parseTwitterHTML(html, url);
            break;
          default:
            metadata = parseGenericHTML(html, url);
        }
      } else {
        // Parser genérico
        metadata = parseGenericHTML(html, url);
      }
    }
    
    // Favicon fallback
    if (!metadata.favicon) {
      const domain = getDomain(url);
      metadata.favicon = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    }
    
    // Limpiar y optimizar descripción
    let description = metadata.description || 'Sin descripción disponible';
    if (description.length > 200) {
      description = description.substring(0, 200) + '...';
    }
    
    // Limpiar título
    let title = metadata.title || getDomain(url);
    if (title.length > 100) {
      title = title.substring(0, 100) + '...';
    }
    
    const linkData: LinkData = {
      url,
      title: decodeHtmlEntities(title),
      description: decodeHtmlEntities(description),
      image: metadata.image,
      favicon: metadata.favicon,
      type: getLinkType(url, platform || undefined),
      domain: getDomain(url),
      timestamp: Date.now(),
      platform: platform || 'generic',
      author: metadata.author,
    };
    
    // Guardar en cache
    linkCache.set(url, { data: linkData, timestamp: Date.now() });
    
    return linkData;
    
  } catch (error) {
    console.error('Link processing failed:', error);
    
    // Fallback: retornar datos básicos del link
    const fallbackData: LinkData = {
      url,
      title: getDomain(url),
      description: 'Vista previa no disponible',
      favicon: `https://icons.duckduckgo.com/ip3/${getDomain(url)}.ico`,
      type: getLinkType(url),
      domain: getDomain(url),
      timestamp: Date.now(),
      platform: 'generic',
    };
    
    return fallbackData;
  }
};

/**
 * Procesa múltiples links concurrentemente
 */
export const processLinks = async (urls: string[]): Promise<LinkData[]> => {
  const promises = urls.map(url => processLink(url));
  return Promise.all(promises);
};

/**
 * Limpia el cache de links
 */
export const clearLinkCache = (): void => {
  linkCache.clear();
};

/**
 * Obtiene estadísticas del cache
 */
export const getLinkCacheStats = (): { size: number; entries: number } => {
  return {
    size: linkCache.size,
    entries: Array.from(linkCache.values()).length
  };
};
