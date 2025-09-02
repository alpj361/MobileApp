export interface LinkData {
  url: string;
  title: string;
  description: string;
  image?: string;
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
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const metadata = parseMetadata(html, url);
    
    return {
      url,
      title: metadata.title || getDomain(url),
      description: metadata.description || 'No description available',
      image: metadata.image,
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
      description: 'Link processing failed',
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