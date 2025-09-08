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
    // Escape special regex characters in the phrase
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(escapedPhrase, 'gi'), ' ');
  }
  
  // Final cleanup
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Platform-specific image extraction
 */
function extractPlatformSpecificImage(html: string, baseUrl: string, platform: string): { url?: string; quality: 'high' | 'medium' | 'low' | 'none' } {
  switch (platform) {
    case 'twitter':
      return extractTwitterImage(html, baseUrl);
    case 'instagram':
      return extractInstagramImage(html, baseUrl);
    case 'tiktok':
      return extractTikTokImage(html, baseUrl);
    default:
      return extractGenericImage(html, baseUrl);
  }
}

/**
 * Enhanced Twitter/X image extraction
 */
function extractTwitterImage(html: string, baseUrl: string): { url?: string; quality: 'high' | 'medium' | 'low' | 'none' } {
  const twitterImagePatterns = [
    // Twitter Card images (highest priority)
    /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+name=["']twitter:image["']/i,
    /<meta\s+name=["']twitter:image:src["']\s+content=["']([^"']+)["']/i,
    
    // Open Graph for Twitter
    /<meta\s+property=["']og:image:secure_url["']\s+content=["']([^"']+)["']/i,
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i,
    
    // Twitter specific patterns
    /<meta\s+name=["']twitter:image:alt["']\s+content=["'][^"']*["'][^>]*>/i,
    
    // Video thumbnails for Twitter videos
    /<meta\s+property=["']og:video:thumbnail["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']twitter:player:image["']\s+content=["']([^"']+)["']/i,
    
    // Twitter media URLs in content
    /https:\/\/pbs\.twimg\.com\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi,
    /https:\/\/ton\.twitter\.com\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi,
  ];

  for (let i = 0; i < twitterImagePatterns.length; i++) {
    const matches = html.match(twitterImagePatterns[i]);
    if (matches) {
      let imageUrl = matches[1]?.trim() || matches[0]?.trim();
      imageUrl = decodeHtmlEntities(imageUrl);
      if (!imageUrl) continue;
      
      imageUrl = makeAbsoluteUrl(imageUrl, baseUrl);
      
      if (isValidImageUrl(imageUrl)) {
        // Higher quality for Twitter Card images
        const quality = i < 3 ? 'high' : i < 6 ? 'medium' : 'low';
        return { url: imageUrl, quality };
      }
    }
  }
  
  return { quality: 'none' };
}

/**
 * Enhanced Instagram image extraction
 */
function extractInstagramImage(html: string, baseUrl: string): { url?: string; quality: 'high' | 'medium' | 'low' | 'none' } {
  const instagramImagePatterns = [
    // Instagram specific meta tags
    /<meta\s+property=["']og:image:secure_url["']\s+content=["']([^"']+)["']/i,
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i,
    
    // Instagram video thumbnails
    /<meta\s+property=["']og:video:thumbnail["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
    
    // Instagram CDN patterns
    /https:\/\/[^"'\s]*\.cdninstagram\.com\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi,
    /https:\/\/scontent[^"'\s]*\.instagram\.com\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi,
    /https:\/\/[^"'\s]*\.fbcdn\.net\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi,
    
    // Instagram story/reel thumbnails
    /<img[^>]*src=["']([^"']*(?:cdninstagram|scontent)[^"']*\.(jpg|jpeg|png|webp))["']/gi,
  ];

  for (let i = 0; i < instagramImagePatterns.length; i++) {
    const matches = html.match(instagramImagePatterns[i]);
    if (matches) {
      let imageUrl = matches[1]?.trim() || matches[0]?.trim();
      imageUrl = decodeHtmlEntities(imageUrl);
      if (!imageUrl) continue;
      
      imageUrl = makeAbsoluteUrl(imageUrl, baseUrl);
      
      if (isValidImageUrl(imageUrl)) {
        const quality = i < 2 ? 'high' : i < 4 ? 'medium' : 'low';
        return { url: imageUrl, quality };
      }
    }
  }
  
  return { quality: 'none' };
}

/**
 * Enhanced TikTok image extraction
 */
function extractTikTokImage(html: string, baseUrl: string): { url?: string; quality: 'high' | 'medium' | 'low' | 'none' } {
  const tiktokImagePatterns = [
    // TikTok Open Graph images
    /<meta\s+property=["']og:image:secure_url["']\s+content=["']([^"']+)["']/i,
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i,
    
    // TikTok video thumbnails
    /<meta\s+property=["']og:video:thumbnail["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
    
    // TikTok CDN patterns
    /https:\/\/[^"'\s]*\.tiktokcdn\.com\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi,
    /https:\/\/[^"'\s]*\.tiktokcdn-[^"'\s]*\.com\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi,
    /https:\/\/p[^"'\s]*\.tiktokcdn\.com\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi,
    
    // TikTok specific image patterns
    /<img[^>]*src=["']([^"']*tiktokcdn[^"']*\.(jpg|jpeg|png|webp))["']/gi,
  ];

  for (let i = 0; i < tiktokImagePatterns.length; i++) {
    const matches = html.match(tiktokImagePatterns[i]);
    if (matches) {
      let imageUrl = matches[1]?.trim() || matches[0]?.trim();
      imageUrl = decodeHtmlEntities(imageUrl);
      if (!imageUrl) continue;
      
      imageUrl = makeAbsoluteUrl(imageUrl, baseUrl);
      
      if (isValidImageUrl(imageUrl) && (imageUrl.includes('tiktok') || imageUrl.includes('musical.ly'))) {
        const quality = i < 2 ? 'high' : i < 4 ? 'medium' : 'low';
        return { url: imageUrl, quality };
      }
    }
  }
  
  return { quality: 'none' };
}

/**
 * Generic image extraction (fallback)
 */
function extractGenericImage(html: string, baseUrl: string): { url?: string; quality: 'high' | 'medium' | 'low' | 'none' } {
  const imagePatterns = [
    // Open Graph image (highest priority)
    /<meta\s+property=["']og:image:secure_url["']\s+content=["']([^"']+)["']/i,
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
      imageUrl = decodeHtmlEntities(imageUrl);
      imageUrl = makeAbsoluteUrl(imageUrl, baseUrl);
      
      if (isValidImageUrl(imageUrl)) {
        const quality = i < 2 ? 'high' : i < 4 ? 'medium' : 'low';
        return { url: imageUrl, quality };
      }
    }
  }
  
  return { quality: 'none' };
}

/**
 * Helper to convert relative URLs to absolute
 */
function makeAbsoluteUrl(imageUrl: string, baseUrl: string): string {
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  if (imageUrl.startsWith('/')) {
    const base = new URL(baseUrl);
    return `${base.protocol}//${base.host}${imageUrl}`;
  }
  
  if (imageUrl.startsWith('./')) {
    const base = new URL(baseUrl);
    return `${base.protocol}//${base.host}${base.pathname}/${imageUrl.substring(2)}`;
  }
  
  const base = new URL(baseUrl);
  return `${base.protocol}//${base.host}/${imageUrl}`;
}

/**
 * Enhanced image URL validation with platform-specific checks
 */
function isValidImageUrl(url: string): boolean {
  if (!url || url.length < 10) return false;
  
  // Basic validation
  try {
    new URL(url);
  } catch {
    return false;
  }
  
  // Check for common image extensions
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|avif|bmp|tiff)(\?.*)?$/i)) {
    return true;
  }
  
  // Platform-specific CDN patterns
  const platformPatterns = [
    // Twitter/X
    /pbs\.twimg\.com/,
    /ton\.twitter\.com/,
    /abs\.twimg\.com/,
    
    // Instagram
    /cdninstagram\.com/,
    /scontent.*\.instagram\.com/,
    /.*\.fbcdn\.net/,
    
    // TikTok
    /tiktokcdn\.com/,
    /tiktokcdn-.*\.com/,
    /p.*\.tiktokcdn\.com/,
    
    // YouTube
    /i\.ytimg\.com/,
    /img\.youtube\.com/,
    
    // Generic CDN patterns
    /cloudinary\.com/,
    /imgur\.com/,
    /amazonaws\.com/,
    /googleusercontent\.com/,
  ];
  
  for (const pattern of platformPatterns) {
    if (pattern.test(url)) {
      return true;
    }
  }
  
  // Check for image-related keywords in URL
  if (url.match(/\b(image|photo|picture|thumbnail|avatar|logo|media|poster|cover)\b/i)) {
    return true;
  }
  
  // Check for common CDN patterns
  if (url.match(/\b(cdn|media|assets|static|img|images)\b/i)) {
    return true;
  }
  
  // Check for base64 data URLs
  if (url.startsWith('data:image/')) {
    return true;
  }
  
  return false;
}

/**
 * Platform-specific title extraction
 */
function extractPlatformSpecificTitle(html: string, url: string, platform: string): string {
  switch (platform) {
    case 'twitter':
      return extractTwitterTitle(html, url);
    case 'instagram':
      return extractInstagramTitle(html, url);
    case 'tiktok':
      return extractTikTokTitle(html, url);
    default:
      return extractGenericTitle(html, url);
  }
}

/**
 * Enhanced Twitter/X title extraction
 */
function extractTwitterTitle(html: string, url: string): string {
  const twitterTitlePatterns = [
    // Twitter specific meta tags
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i,
    /<meta\s+content=["']([^"']+)["']\s+name=["']twitter:title["']/i,
    
    // Twitter page title
    /<title>([^<]+)<\/title>/i,
  ];
  
  for (const pattern of twitterTitlePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let title = cleanHtmlContent(match[1].trim());
      
      // Clean Twitter-specific suffixes
      title = title.replace(/\s*[\|\-–—]\s*(Twitter|X|on X).*$/i, '').trim();
      title = title.replace(/\s*on Twitter.*$/i, '').trim();
      title = title.replace(/\s*\/ X.*$/i, '').trim();
      
      // Extract tweet content from title format: "User on X: Tweet content"
      const tweetContentMatch = title.match(/^[^:]+:\s*(.+)$/);
      if (tweetContentMatch && tweetContentMatch[1]) {
        title = tweetContentMatch[1].trim();
      }
      
      if (title.length > 3 && title.length < 280) {
        return title;
      }
    }
  }
  
  return new URL(url).hostname.replace('www.', '') || 'Tweet';
}

/**
 * Enhanced Instagram title extraction
 */
function extractInstagramTitle(html: string, url: string): string {
  const instagramTitlePatterns = [
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i,
    /<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i,
    /<title>([^<]+)<\/title>/i,
  ];
  
  for (const pattern of instagramTitlePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let title = cleanHtmlContent(match[1].trim());
      
      // Clean Instagram-specific suffixes
      title = title.replace(/\s*[\|\-–—]\s*Instagram.*$/i, '').trim();
      title = title.replace(/\s*on Instagram.*$/i, '').trim();
      title = title.replace(/\s*•\s*Instagram.*$/i, '').trim();
      
      // Extract user and content from Instagram format
      const instagramMatch = title.match(/^(.+?)\s*(?:on Instagram|:|•)\s*(.*)$/i);
      if (instagramMatch && instagramMatch[2]) {
        const user = instagramMatch[1].trim();
        const content = instagramMatch[2].trim();
        title = content || `Post by ${user}`;
      }
      
      if (title.length > 3 && title.length < 300) {
        return title;
      }
    }
  }
  
  return new URL(url).hostname.replace('www.', '') || 'Instagram Post';
}

/**
 * Enhanced TikTok title extraction
 */
function extractTikTokTitle(html: string, url: string): string {
  const tiktokTitlePatterns = [
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i,
    /<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i,
    /<title>([^<]+)<\/title>/i,
  ];
  
  for (const pattern of tiktokTitlePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let title = cleanHtmlContent(match[1].trim());
      
      // Clean TikTok-specific suffixes
      title = title.replace(/\s*[\|\-–—]\s*TikTok.*$/i, '').trim();
      title = title.replace(/\s*on TikTok.*$/i, '').trim();
      title = title.replace(/\s*•\s*TikTok.*$/i, '').trim();
      
      if (title.length > 3 && title.length < 300) {
        return title;
      }
    }
  }
  
  return new URL(url).hostname.replace('www.', '') || 'TikTok Video';
}

/**
 * Generic title extraction (fallback)
 */
function extractGenericTitle(html: string, url: string): string {
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
 * Platform-specific description extraction
 */
function extractPlatformSpecificDescription(html: string, platform: string): string {
  switch (platform) {
    case 'twitter':
      return extractTwitterDescription(html);
    case 'instagram':
      return extractInstagramDescription(html);
    case 'tiktok':
      return extractTikTokDescription(html);
    default:
      return extractGenericDescription(html);
  }
}

/**
 * Enhanced Twitter/X description extraction
 */
function extractTwitterDescription(html: string): string {
  const twitterDescriptionPatterns = [
    // Twitter specific meta descriptions
    /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i,
    /<meta\s+content=["']([^"']+)["']\s+name=["']twitter:description["']/i,
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
  ];
  
  for (const pattern of twitterDescriptionPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let description = cleanHtmlContent(match[1].trim());
      
      // Clean Twitter-specific artifacts
      description = description.replace(/^"([^"]*)"$/, '$1'); // Remove surrounding quotes
      description = description.replace(/\s*via\s+@\w+\s*$/i, ''); // Remove "via @username"
      description = description.replace(/\s*—\s*Twitter.*$/i, ''); // Remove Twitter suffixes
      
      // Clean common Twitter spam patterns
      description = description.replace(/\b(?:RT|retweet)\b/gi, '');
      description = description.replace(/\s+/g, ' ').trim();
      
      if (description.length > 10 && description.length < 280) {
        return description;
      }
    }
  }
  
  return '';
}

/**
 * Enhanced Instagram description extraction
 */
function extractInstagramDescription(html: string): string {
  const instagramDescriptionPatterns = [
    /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i,
    /<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
  ];
  
  for (const pattern of instagramDescriptionPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let description = cleanHtmlContent(match[1].trim());
      
      // Clean Instagram-specific artifacts
      description = description.replace(/^\d+\s+Likes?,?\s*/i, ''); // Remove "123 Likes, "
      description = description.replace(/^\d+\s+Comments?,?\s*/i, ''); // Remove "45 Comments, "
      description = description.replace(/\s*on Instagram.*$/i, ''); // Remove "on Instagram"
      description = description.replace(/^"([^"]*)"$/, '$1'); // Remove surrounding quotes
      
      // Clean hashtags at the end for better readability
      const hashtagIndex = description.search(/\s+#\w+/);
      if (hashtagIndex > 50) { // Keep hashtags if they're part of the main content
        const mainContent = description.substring(0, hashtagIndex).trim();
        const hashtags = description.substring(hashtagIndex).trim();
        if (mainContent.length > 20) {
          description = `${mainContent} ${hashtags}`;
        }
      }
      
      if (description.length > 10 && description.length < 500) {
        return description;
      }
    }
  }
  
  return '';
}

/**
 * Enhanced TikTok description extraction
 */
function extractTikTokDescription(html: string): string {
  const tiktokDescriptionPatterns = [
    /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i,
    /<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
  ];
  
  for (const pattern of tiktokDescriptionPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let description = cleanHtmlContent(match[1].trim());
      
      // Clean TikTok-specific artifacts
      description = description.replace(/\s*on TikTok.*$/i, ''); // Remove "on TikTok"
      description = description.replace(/^"([^"]*)"$/, '$1'); // Remove surrounding quotes
      description = description.replace(/^\w+\s*\(@\w+\)\s*has created a short video/i, ''); // Remove TikTok format prefix
      
      // Clean common TikTok patterns
      description = description.replace(/\s*#fyp\s*/gi, ' '); // Remove #fyp
      description = description.replace(/\s*#foryou\s*/gi, ' '); // Remove #foryou
      description = description.replace(/\s*#viral\s*/gi, ' '); // Remove #viral
      
      // Preserve hashtags that are part of the content
      description = description.replace(/\s+/g, ' ').trim();
      
      if (description.length > 10 && description.length < 500) {
        return description;
      }
    }
  }
  
  return '';
}

/**
 * Generic description extraction (fallback)
 */
function extractGenericDescription(html: string): string {
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
 * Enhanced platform detection with URL pattern matching
 */
function detectPlatform(url: string): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    const path = urlObj.pathname.toLowerCase();
    
    // Twitter/X detection
    if (domain.includes('twitter.com') || domain.includes('x.com') || domain === 't.co') {
      return 'twitter';
    }
    
    // Instagram detection (including various subdomains)
    if (domain.includes('instagram.com') || domain.includes('instagr.am')) {
      return 'instagram';
    }
    
    // TikTok detection (including shortened URLs)
    if (domain.includes('tiktok.com') || domain.includes('vm.tiktok.com') || domain.includes('musical.ly')) {
      return 'tiktok';
    }
    
    // YouTube detection
    if (domain.includes('youtube.com') || domain.includes('youtu.be') || domain.includes('youtube.app.goo.gl')) {
      return 'youtube';
    }
    
    // LinkedIn detection
    if (domain.includes('linkedin.com') || domain.includes('lnkd.in')) {
      return 'linkedin';
    }
    
    // Facebook detection
    if (domain.includes('facebook.com') || domain.includes('fb.com') || domain.includes('fb.me')) {
      return 'facebook';
    }
    
    // Reddit detection
    if (domain.includes('reddit.com') || domain.includes('redd.it')) {
      return 'reddit';
    }
    
    // Additional social platforms
    if (domain.includes('snapchat.com')) return 'snapchat';
    if (domain.includes('discord.com') || domain.includes('discord.gg')) return 'discord';
    if (domain.includes('twitch.tv')) return 'twitch';
    if (domain.includes('pinterest.com') || domain.includes('pin.it')) return 'pinterest';
  
  return 'generic';
  } catch {
  return 'generic';
  }
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
    
    // Extract metadata using platform-specific functions
    const platform = detectPlatform(url);
    const title = extractPlatformSpecificTitle(html, url, platform);
    const description = extractPlatformSpecificDescription(html, platform);
    const author = extractAuthor(html);
    const imageData = extractPlatformSpecificImage(html, url, platform);
    
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