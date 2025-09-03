export interface LinkData {
  url: string;
  title: string;
  description: string;
  image?: string;
  favicon?: string;
  type: 'link' | 'tweet' | 'video' | 'article';
  domain: string;
  timestamp: number;
}

/**
 * Extract URLs from text using regex
 */
export const extractLinksFromText = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
};

/**
 * Determine link type based on URL
 */
const getLinkType = (url: string): LinkData['type'] => {
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
 * Extract domain from URL
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
 * Parse HTML content to extract Open Graph metadata
 */
const parseMetadata = (html: string, url: string): Partial<LinkData> => {
  const metadata: Partial<LinkData> = {};
  
  // Extract title
  const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/) ||
                    html.match(/<meta name="twitter:title" content="([^"]*)"/) ||
                    html.match(/<title>([^<]*)<\/title>/);
  if (titleMatch) {
    metadata.title = titleMatch[1].trim();
  }
  
  // Extract description
  const descMatch = html.match(/<meta property="og:description" content="([^"]*)"/) ||
                   html.match(/<meta name="twitter:description" content="([^"]*)"/) ||
                   html.match(/<meta name="description" content="([^"]*)"/) ||
                   html.match(/<meta property="description" content="([^"]*)"/);
  if (descMatch) {
    metadata.description = descMatch[1].trim();
  }
  
  // Extract image
  const imageMatch = html.match(/<meta property="og:image" content="([^"]*)"/) ||
                    html.match(/<meta name="twitter:image" content="([^"]*)"/) ||
                    html.match(/<meta property="twitter:image" content="([^"]*)"/);
  if (imageMatch) {
    let imageUrl = imageMatch[1].trim();
    // Handle relative URLs
    if (imageUrl.startsWith('/')) {
      const baseUrl = new URL(url);
      imageUrl = `${baseUrl.protocol}//${baseUrl.host}${imageUrl}`;
    }
    metadata.image = imageUrl;
  }
  
  return metadata;
};

/**
 * Parse JSON-LD metadata where available
 */
const parseJsonLd = (html: string, url: string): Partial<LinkData> => {
  try {
    const scripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!scripts) return {};
    let raw = scripts[1].trim();
    raw = raw.replace(/<!--([\s\S]*?)-->/g, '');
    let data: any;
    try { data = JSON.parse(raw); } catch { return {}; }
    const pick = (obj: any): Partial<LinkData> => {
      if (!obj) return {};
      const md: Partial<LinkData> = {};
      const type = (obj['@type'] || obj.type || '').toString().toLowerCase();
      if (type.includes('article') || type.includes('blogposting') || type.includes('newsarticle')) {
        md.title = obj.headline || obj.name || md.title;
        md.description = obj.description || obj.abstract || md.description;
        const img = obj.image?.url || obj.image || obj.thumbnailUrl;
        if (img) md.image = typeof img === 'string' ? img : img?.[0];
      } else if (type.includes('video')) {
        md.title = obj.name || md.title;
        md.description = obj.description || md.description;
        md.image = obj.thumbnailUrl || obj.image;
      } else if (type.includes('product')) {
        md.title = obj.name || md.title;
        md.description = obj.description || md.description;
        const price = obj.offers?.price ? `${obj.offers.price} ${obj.offers.priceCurrency || ''}`.trim() : '';
        if (price && !md.description) md.description = `Precio: ${price}`;
        const img = obj.image?.[0] || obj.image;
        if (img) md.image = img;
      } else if (type.includes('webpage')) {
        md.title = obj.name || md.title;
        md.description = obj.description || md.description;
      }
      return md;
    };
    if (Array.isArray(data)) {
      for (const el of data) {
        const md = pick(el);
        if (Object.keys(md).length) return md;
      }
      return {};
    }
    return pick(data);
  } catch {
    return {};
  }
};

/**
 * Fallback oEmbed for YouTube
 */
const fetchOEmbed = async (url: string): Promise<Partial<LinkData>> => {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    if (!(domain.includes('youtube.com') || domain.includes('youtu.be'))) return {};
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) return {};
    const data = await res.json();
    return { title: data.title, image: data.thumbnail_url };
  } catch { return {}; }
};

/**
 * If description is JSON-like/selectors, convert to human text
 */
const humanizeDescription = (text?: string): string | undefined => {
  if (!text) return undefined;
  const raw = text.trim();
  if ((raw.startsWith('{') || raw.startsWith('[')) && raw.endsWith('}')) {
    try {
      const obj = JSON.parse(raw);
      const pick = (o: any): string | undefined => {
        if (!o) return undefined;
        return o.description || o.summary || o.text || o.abstract || o.title || o.name;
      };
      const val = Array.isArray(obj) ? pick(obj[0]) : pick(obj);
      if (val) return String(val);
    } catch {}
  }
  if (/(\.|#|\[|\]|>)/.test(raw) && raw.length < 240) {
    return undefined;
  }
  return raw.replace(/\s+/g, ' ').slice(0, 220);
};

/**
 * Process a URL and extract metadata
 */
export const processLink = async (url: string): Promise<LinkData> => {
  try {
    // Validate URL
    new URL(url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkProcessor/1.0)',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    let metadata = parseMetadata(html, url);

    // Merge JSON-LD
    const ld = parseJsonLd(html, url);
    metadata = { ...metadata, ...Object.fromEntries(Object.entries(ld).filter(([_, v]) => v)) };

    // If still no image, try oEmbed
    if (!metadata.image) {
      const oe = await fetchOEmbed(url);
      if (oe.image) metadata.image = oe.image;
      if (oe.title && !metadata.title) metadata.title = oe.title;
    }

    // Favicon fallback
    if (!metadata.favicon) {
      const domain = getDomain(url);
      metadata.favicon = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    }

    const desc = humanizeDescription(metadata.description) || metadata.description;
    
    return {
      url,
      title: metadata.title || getDomain(url),
      description: desc || 'Sin descripción disponible',
      image: metadata.image,
      favicon: metadata.favicon,
      type: getLinkType(url),
      domain: getDomain(url),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Link processing failed:', error);
    
    // Fallback: return basic link data
    return {
      url,
      title: getDomain(url),
      description: 'Vista previa no disponible',
      favicon: `https://icons.duckduckgo.com/ip3/${getDomain(url)}.ico`,
      type: getLinkType(url),
      domain: getDomain(url),
      timestamp: Date.now(),
    };
  }
};

/**
 * Process multiple links concurrently
 */
export const processLinks = async (urls: string[]): Promise<LinkData[]> => {
  const promises = urls.map(url => processLink(url));
  return Promise.all(promises);
};