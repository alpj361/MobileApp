/**
 * Improved Link Processor - Clean HTML Scraping Without External APIs
 * Focuses on robust content extraction and cleaning without third-party dependencies
 */

import { LinkData } from './link-processor';

// Enhanced LinkData interface with quality scoring
export interface ImprovedLinkData extends LinkData {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  contentScore: number;
  hasCleanDescription: boolean;
  imageQuality: 'high' | 'medium' | 'low' | 'none';
  processingTime: number;
  lastUpdated: number;
}

// Cache configuration
const CACHE_CONFIG = {
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  socialTTL: 6 * 60 * 60 * 1000,   // 6 hours for social media
  maxCacheSize: 500,
};

// Simple cache implementation
class LinkCache {
  private cache = new Map<string, {
    data: ImprovedLinkData;
    timestamp: number;
    ttl: number;
  }>();
  private hits = 0;
  private gets = 0;

  set(url: string, data: ImprovedLinkData): void {
    const ttl = this.getTTLForDomain(url);
    
    if (this.cache.size >= CACHE_CONFIG.maxCacheSize) {
      this.cleanOldEntries();
    }

    this.cache.set(url, {
      data: { ...data, lastUpdated: Date.now() },
      timestamp: Date.now(),
      ttl,
    });
  }

  get(url: string): ImprovedLinkData | null {
    this.gets++;
    const entry = this.cache.get(url);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(url);
      return null;
    }

    this.hits++;
    return entry.data;
  }

  getStats(): { size: number; hitRate: number } {
    const hitRate = this.gets > 0 ? Math.round((this.hits / this.gets) * 100) : 0;
    return { size: this.cache.size, hitRate };
  }

  private getTTLForDomain(url: string): number {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      
      if (domain.includes('twitter.com') || domain.includes('instagram.com') || 
          domain.includes('tiktok.com') || domain.includes('facebook.com')) {
        return CACHE_CONFIG.socialTTL;
      }
      
      return CACHE_CONFIG.defaultTTL;
    } catch {
      return CACHE_CONFIG.defaultTTL;
    }
  }

  private cleanOldEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = Math.floor(entries.length * 0.3);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.gets = 0;
  }
}

const linkCache = new LinkCache();

/**
 * Comprehensive HTML entity decoder
 */
function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  
  let decoded = text;
  
  // Common named entities
  const namedEntities: { [key: string]: string } = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": "\"",
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&copy;": "(c)",
    "&reg;": "(R)",
    "&trade;": "(TM)",
    "&hellip;": "...",
    "&mdash;": "-",
    "&ndash;": "-",
    "&lsquo;": "'",
    "&rsquo;": "'",
    "&ldquo;": "\"",
    "&rdquo;": "\"",
  };

  // Replace named entities
  for (const [entity, replacement] of Object.entries(namedEntities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), replacement);
  }
  
  // Replace numeric entities (decimal)
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    try {
      const code = parseInt(dec, 10);
      if (code > 0 && code < 1114112) { // Valid Unicode range
        return String.fromCharCode(code);
      }
    } catch {
      // Ignore invalid entities
    }
    return match;
  });
  
  // Replace numeric entities (hexadecimal)
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    try {
      const code = parseInt(hex, 16);
      if (code > 0 && code < 1114112) { // Valid Unicode range
        return String.fromCharCode(code);
      }
    } catch {
      // Ignore invalid entities
    }
    return match;
  });
  
  return decoded;
}

/**
 * Comprehensive HTML and CSS cleaner
 */
function cleanHtmlContent(text: string): string {
  if (!text) return text;
  
  let cleaned = text;
  
  // Remove script tags and their content
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove style tags and their content
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove all HTML tags but preserve content
  cleaned = cleaned.replace(/<[^>]*>/g, ' ');
  
  // Remove CSS-like content (anything between curly braces)
  cleaned = cleaned.replace(/\{[^}]*\}/g, ' ');
  
  // Remove inline styles and attributes
  cleaned = cleaned.replace(/style\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/class\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/id\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove CSS selectors and properties
  cleaned = cleaned.replace(/[.#][\w-]+\s*\{[^}]*\}/g, '');
  cleaned = cleaned.replace(/[\w-]+\s*:\s*[^;]+;/g, '');
  
  // Remove JavaScript-like content
  cleaned = cleaned.replace(/function\s*\([^)]*\)\s*\{[^}]*\}/g, '');
  cleaned = cleaned.replace(/var\s+\w+\s*=\s*[^;]+;/g, '');
  
  // Decode HTML entities
  cleaned = decodeHtmlEntities(cleaned);
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\n\s*\n/g, '\n');
  cleaned = cleaned.trim();
  
  // Remove common unwanted phrases
  const unwantedPhrases = [
    'javascript:void(0)',
    'document.write',
    'window.location',
    'function(',
    'var ',
    'const ',
    'let ',
    '{',
    '}',
    '/*',
    '*/',
    '//',
  ];
  
  for (const phrase of unwantedPhrases) {
    cleaned = cleaned.replace(new RegExp(phrase, 'gi'), ' ');
  }
  
  // Final cleanup
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Extract and validate image URLs with quality scoring
 */
function extractImageUrl(html: string, baseUrl: string): { url?: string; quality: 'high' | 'medium' | 'low' | 'none' } {
  const imagePatterns = [
    // Open Graph image (highest priority)
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i,
    
    // Twitter Card image
    /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+name=["']twitter:image["']/i,
    
    // Other meta images
    /<meta\s+property=["']og:image:url["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']twitter:image:src["']\s+content=["']([^"']+)["']/i,
    
    // Link rel image
    /<link\s+rel=["']image_src["']\s+href=["']([^"']+)["']/i,
    
    // Schema.org images
    /<meta\s+itemprop=["']image["']\s+content=["']([^"']+)["']/i,
    
    // First meaningful img tag
    /<img[^>]*src=["']([^"']+)["'][^>]*(?:class=["'][^"']*(?:hero|featured|main|banner|thumbnail)[^"']*["']|id=["'][^"']*(?:hero|featured|main|banner|thumbnail)[^"']*["'])/i,
  ];
  
  for (let i = 0; i < imagePatterns.length; i++) {
    const match = html.match(imagePatterns[i]);
    if (match && match[1]) {
      let imageUrl = match[1].trim();
      
      // Convert relative URLs to absolute
      if (imageUrl.startsWith('/')) {
        const base = new URL(baseUrl);
        imageUrl = `${base.protocol}//${base.host}${imageUrl}`;
      } else if (imageUrl.startsWith('./')) {
        const base = new URL(baseUrl);
        imageUrl = `${base.protocol}//${base.host}${base.pathname}/${imageUrl.substring(2)}`;
      } else if (!imageUrl.startsWith('http')) {
        const base = new URL(baseUrl);
        imageUrl = `${base.protocol}//${base.host}/${imageUrl}`;
      }
      
      // Validate image URL format
      if (isValidImageUrl(imageUrl)) {
        const quality = i < 2 ? 'high' : i < 4 ? 'medium' : 'low';
        return { url: imageUrl, quality };
      }
    }
  }
  
  return { quality: 'none' };
}

/**
 * Validate if URL looks like a valid image
 */
function isValidImageUrl(url: string): boolean {
  if (!url || url.length < 10) return false;
  
  // Check for common image extensions
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i)) {
    return true;
  }
  
  // Check for image-related keywords in URL
  if (url.includes('image') || url.includes('photo') || url.includes('picture') || 
      url.includes('thumbnail') || url.includes('avatar') || url.includes('logo')) {
    return true;
  }
  
  // Check for CDN patterns
  if (url.includes('cdn') || url.includes('media') || url.includes('assets')) {
    return true;
  }
  
  return false;
}

/**
 * Extract title with priority system and cleaning
 */
function extractTitle(html: string, url: string): string {
  const titlePatterns = [
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i,
    /<meta\s+property=["']article:title["']\s+content=["']([^"']+)["']/i,
    /<title>([^<]+)<\/title>/i,
    /<h1[^>]*>([^<]+)<\/h1>/i,
  ];
  
  for (const pattern of titlePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let title = cleanHtmlContent(match[1].trim());
      
      // Remove common site suffixes
      title = title.replace(/\s*[\|\-–—]\s*.*$/, '').trim();
      
      if (title.length > 5 && title.length < 200) {
        return title;
      }
    }
  }
  
  // Fallback to domain
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'Unknown Site';
  }
}

/**
 * Extract description with priority system and cleaning
 */
function extractDescription(html: string): string {
  const descriptionPatterns = [
    /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+property=["']article:description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+itemprop=["']description["']\s+content=["']([^"']+)["']/i,
  ];
  
  for (const pattern of descriptionPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let description = cleanHtmlContent(match[1].trim());
      
      if (description.length > 20 && description.length < 500) {
        return description;
      }
    }
  }
  
  // Fallback to first meaningful paragraph
  const paragraphMatch = html.match(/<p[^>]*>([^<]{50,300})<\/p>/i);
  if (paragraphMatch && paragraphMatch[1]) {
    const description = cleanHtmlContent(paragraphMatch[1].trim());
    if (description.length > 20) {
      return description;
    }
  }
  
  return '';
}

/**
 * Extract author information
 */
function extractAuthor(html: string): string {
  const authorPatterns = [
    /<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i,
    /<meta\s+property=["']article:author["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']twitter:creator["']\s+content=["']([^"']+)["']/i,
    /<meta\s+itemprop=["']author["']\s+content=["']([^"']+)["']/i,
  ];
  
  for (const pattern of authorPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let author = cleanHtmlContent(match[1].trim());
      author = author.replace(/^@/, ''); // Remove @ prefix
      
      if (author.length > 0 && author.length < 100) {
        return author;
      }
    }
  }
  
  return '';
}

/**
 * Calculate content quality score
 */
function calculateContentScore(data: {
  title: string;
  description: string;
  image?: string;
  author?: string;
  imageQuality: 'high' | 'medium' | 'low' | 'none';
}): { score: number; quality: 'excellent' | 'good' | 'fair' | 'poor' } {
  let score = 0;
  
  // Title scoring (0-30 points)
  if (data.title && data.title.length > 5) {
    score += Math.min(30, data.title.length * 0.5);
  }
  
  // Description scoring (0-40 points)
  if (data.description && data.description.length > 20) {
    score += Math.min(40, data.description.length * 0.2);
  }
  
  // Image scoring (0-20 points)
  if (data.image) {
    switch (data.imageQuality) {
      case 'high': score += 20; break;
      case 'medium': score += 15; break;
      case 'low': score += 10; break;
    }
  }
  
  // Author scoring (0-10 points)
  if (data.author && data.author.length > 0) {
    score += 10;
  }
  
  // Determine quality level
  let quality: 'excellent' | 'good' | 'fair' | 'poor';
  if (score >= 80) quality = 'excellent';
  else if (score >= 60) quality = 'good';
  else if (score >= 40) quality = 'fair';
  else quality = 'poor';
  
  return { score, quality };
}

/**
 * Detect platform from URL
 */
function detectPlatform(url: string): string {
  const domain = new URL(url).hostname.toLowerCase();
  
  if (domain.includes('twitter.com') || domain.includes('x.com')) return 'twitter';
  if (domain.includes('youtube.com') || domain.includes('youtu.be')) return 'youtube';
  if (domain.includes('instagram.com')) return 'instagram';
  if (domain.includes('tiktok.com')) return 'tiktok';
  if (domain.includes('linkedin.com')) return 'linkedin';
  if (domain.includes('facebook.com')) return 'facebook';
  if (domain.includes('reddit.com')) return 'reddit';
  
  return 'generic';
}

/**
 * Determine content type
 */
function determineContentType(url: string): LinkData['type'] {
  const domain = new URL(url).hostname.toLowerCase();
  
  if (domain.includes('twitter.com') || domain.includes('x.com')) return 'tweet';
  if (domain.includes('youtube.com') || domain.includes('youtu.be')) return 'video';
  if (domain.includes('instagram.com')) return 'instagram';
  if (domain.includes('tiktok.com')) return 'tiktok';
  
  if (domain.includes('medium.com') || domain.includes('substack.com') || 
      domain.includes('blog') || url.includes('/blog/') || 
      domain.includes('news') || url.includes('/article/')) {
    return 'article';
  }
  
  return 'link';
}

/**
 * Main link processing function
 */
export async function processImprovedLink(url: string): Promise<ImprovedLinkData> {
  // Check cache first
  const cached = linkCache.get(url);
  if (cached) {
    return cached;
  }

  const startTime = Date.now();
  
  try {
    // Validate URL
    new URL(url);
    
    // Fetch HTML content
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract metadata
    const title = extractTitle(html, url);
    const description = extractDescription(html);
    const author = extractAuthor(html);
    const imageData = extractImageUrl(html, url);
    
    // Calculate quality score
    const { score, quality } = calculateContentScore({
      title,
      description,
      image: imageData.url,
      author,
      imageQuality: imageData.quality,
    });
    
    const domain = new URL(url).hostname.replace('www.', '');
    const processingTime = Date.now() - startTime;
    
    const linkData: ImprovedLinkData = {
      url,
      title,
      description: description || 'No description available',
      image: imageData.url,
      favicon: `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      type: determineContentType(url),
      domain,
      timestamp: Date.now(),
      platform: detectPlatform(url) as any,
      author: author || undefined,
      quality,
      contentScore: score,
      hasCleanDescription: description.length > 20,
      imageQuality: imageData.quality,
      processingTime,
      lastUpdated: Date.now(),
    };
    
    // Cache the result
    linkCache.set(url, linkData);
    
    return linkData;
    
  } catch (error) {
    console.error('Link processing failed:', error);
    
    // Fallback data
    const domain = new URL(url).hostname.replace('www.', '');
    const fallbackData: ImprovedLinkData = {
      url,
      title: domain,
      description: 'Preview not available',
      favicon: `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      type: determineContentType(url),
      domain,
      timestamp: Date.now(),
      platform: detectPlatform(url) as any,
      quality: 'poor',
      contentScore: 10,
      hasCleanDescription: false,
      imageQuality: 'none',
      processingTime: Date.now() - startTime,
      lastUpdated: Date.now(),
    };
    
    return fallbackData;
  }
}

/**
 * Process multiple links concurrently
 */
export async function processImprovedLinks(urls: string[]): Promise<ImprovedLinkData[]> {
  const batchSize = 3;
  const results: ImprovedLinkData[] = [];
  
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchPromises = batch.map(url => processImprovedLink(url));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Add delay between batches to be respectful
    if (i + batchSize < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Clear cache
 */
export function clearImprovedCache(): void {
  linkCache.clear();
}

/**
 * Cache stats for Settings screen
 */
export function getImprovedCacheStats(): { size: number; hitRate: number } {
  return linkCache.getStats();
}

/**
 * Extract links from text
 */
export function extractLinksFromText(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}