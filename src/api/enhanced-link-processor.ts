/**
 * Enhanced Link Processor with Professional API Integration
 * Provides high-quality metadata extraction using LinkPreview.net API with fallbacks
 */

import { LinkData } from './link-processor';

// Enhanced metadata interface with quality indicators
export interface EnhancedLinkData extends LinkData {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  metadataSource: 'linkpreview' | 'microlink' | 'oembed' | 'html_scraping' | 'fallback';
  imageValidated: boolean;
  descriptionSource: 'meta' | 'og' | 'twitter' | 'content' | 'generated';
  processingTime: number;
  retryCount: number;
  lastUpdated: number;
}

// API Configuration
const API_CONFIG = {
  linkpreview: {
    baseUrl: 'https://api.linkpreview.net',
    key: process.env.EXPO_PUBLIC_LINKPREVIEW_API_KEY,
    rateLimit: 1000, // requests per hour for free plan
    timeout: 10000,
  },
  microlink: {
    baseUrl: 'https://api.microlink.io',
    key: process.env.EXPO_PUBLIC_MICROLINK_API_KEY,
    rateLimit: 100, // requests per day for free plan
    timeout: 15000,
  }
};

// Image validation configuration
const IMAGE_CONFIG = {
  minWidth: 150,
  minHeight: 150,
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  timeout: 5000,
};

// Cache configuration
const CACHE_CONFIG = {
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  socialTTL: 6 * 60 * 60 * 1000,   // 6 hours for social media
  newsTTL: 2 * 60 * 60 * 1000,     // 2 hours for news sites
  maxCacheSize: 1000,
};

// Enhanced cache with TTL and quality tracking
class EnhancedLinkCache {
  private cache = new Map<string, {
    data: EnhancedLinkData;
    timestamp: number;
    ttl: number;
    accessCount: number;
  }>();

  set(url: string, data: EnhancedLinkData, customTTL?: number): void {
    const ttl = customTTL || this.getTTLForDomain(url);
    
    // Clean old entries if cache is full
    if (this.cache.size >= CACHE_CONFIG.maxCacheSize) {
      this.cleanOldEntries();
    }

    this.cache.set(url, {
      data: { ...data, lastUpdated: Date.now() },
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
    });
  }

  get(url: string): EnhancedLinkData | null {
    const entry = this.cache.get(url);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(url);
      return null;
    }

    // Update access count
    entry.accessCount++;
    return entry.data;
  }

  private getTTLForDomain(url: string): number {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      
      // Social media platforms - shorter TTL
      if (domain.includes('twitter.com') || domain.includes('instagram.com') || 
          domain.includes('tiktok.com') || domain.includes('facebook.com')) {
        return CACHE_CONFIG.socialTTL;
      }
      
      // News sites - shorter TTL
      if (domain.includes('news') || domain.includes('cnn.com') || 
          domain.includes('bbc.com') || domain.includes('reuters.com')) {
        return CACHE_CONFIG.newsTTL;
      }
      
      return CACHE_CONFIG.defaultTTL;
    } catch {
      return CACHE_CONFIG.defaultTTL;
    }
  }

  private cleanOldEntries(): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by access count and age, remove least used and oldest
    entries.sort((a, b) => {
      const ageA = Date.now() - a[1].timestamp;
      const ageB = Date.now() - b[1].timestamp;
      const scoreA = a[1].accessCount - (ageA / 1000000); // Penalize age
      const scoreB = b[1].accessCount - (ageB / 1000000);
      return scoreA - scoreB;
    });

    // Remove bottom 20%
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; hitRate: number } {
    const entries = Array.from(this.cache.values());
    const totalAccess = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const hitRate = entries.length > 0 ? totalAccess / entries.length : 0;
    
    return {
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }
}

// Global enhanced cache instance
const enhancedCache = new EnhancedLinkCache();

/**
 * Validates image URL and extracts metadata
 */
async function validateImage(imageUrl: string): Promise<{
  isValid: boolean;
  width?: number;
  height?: number;
  size?: number;
  type?: string;
}> {
  if (!imageUrl) return { isValid: false };

  try {
    // First check if URL is accessible
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_CONFIG.timeout);
    
    const response = await fetch(imageUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) return { isValid: false };

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    // Validate content type
    if (!contentType || !IMAGE_CONFIG.allowedTypes.some(type => contentType.includes(type))) {
      return { isValid: false };
    }

    // Validate size
    const size = contentLength ? parseInt(contentLength) : 0;
    if (size > IMAGE_CONFIG.maxSize) {
      return { isValid: false };
    }

    // For now, we'll assume valid dimensions if we can't get them
    // In a real implementation, you might want to download a portion of the image
    // to get actual dimensions
    return {
      isValid: true,
      type: contentType,
      size,
      width: 0, // Would need image processing library to get actual dimensions
      height: 0,
    };

  } catch (error) {
    console.log('Image validation failed:', error);
    return { isValid: false };
  }
}

/**
 * Calls LinkPreview.net API
 */
async function callLinkPreviewAPI(url: string): Promise<EnhancedLinkData | null> {
  if (!API_CONFIG.linkpreview.key || API_CONFIG.linkpreview.key === 'your_linkpreview_api_key_here') {
    return null;
  }

  try {
    const startTime = Date.now();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.linkpreview.timeout);
    
    const response = await fetch(`${API_CONFIG.linkpreview.baseUrl}?q=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        'X-Linkpreview-Api-Key': API_CONFIG.linkpreview.key,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`LinkPreview API error: ${response.status}`);
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;

    // Validate image if present
    let imageValidated = false;
    if (data.image) {
      const imageValidation = await validateImage(data.image);
      imageValidated = imageValidation.isValid;
      
      // If image is invalid, try to find a better one
      if (!imageValidated) {
        data.image = undefined;
      }
    }

    // Determine quality based on available data
    let quality: EnhancedLinkData['quality'] = 'poor';
    if (data.title && data.description && data.image && imageValidated) {
      quality = 'excellent';
    } else if (data.title && data.description) {
      quality = 'good';
    } else if (data.title || data.description) {
      quality = 'fair';
    }

    const enhancedData: EnhancedLinkData = {
      url: data.url || url,
      title: data.title || new URL(url).hostname,
      description: data.description || 'No description available',
      image: data.image,
      favicon: `https://icons.duckduckgo.com/ip3/${new URL(url).hostname}.ico`,
      type: determineContentType(url, data),
      domain: new URL(url).hostname.replace('www.', ''),
      timestamp: Date.now(),
      platform: detectPlatform(url) as any,
      author: data.author,
      quality,
      metadataSource: 'linkpreview',
      imageValidated,
      descriptionSource: data.description ? 'meta' : 'generated',
      processingTime,
      retryCount: 0,
      lastUpdated: Date.now(),
    };

    return enhancedData;

  } catch (error) {
    console.log('LinkPreview API failed:', error);
    return null;
  }
}

/**
 * Calls Microlink.io API as fallback
 */
async function callMicrolinkAPI(url: string): Promise<EnhancedLinkData | null> {
  if (!API_CONFIG.microlink.key || API_CONFIG.microlink.key === 'your_microlink_api_key_here') {
    return null;
  }

  try {
    const startTime = Date.now();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.microlink.timeout);
    
    const response = await fetch(`${API_CONFIG.microlink.baseUrl}?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        'x-api-key': API_CONFIG.microlink.key,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Microlink API error: ${response.status}`);
    }

    const result = await response.json();
    const data = result.data;
    const processingTime = Date.now() - startTime;

    if (!data) return null;

    // Validate image if present
    let imageValidated = false;
    if (data.image?.url) {
      const imageValidation = await validateImage(data.image.url);
      imageValidated = imageValidation.isValid;
    }

    // Determine quality
    let quality: EnhancedLinkData['quality'] = 'poor';
    if (data.title && data.description && data.image?.url && imageValidated) {
      quality = 'excellent';
    } else if (data.title && data.description) {
      quality = 'good';
    } else if (data.title || data.description) {
      quality = 'fair';
    }

    const enhancedData: EnhancedLinkData = {
      url: data.url || url,
      title: data.title || new URL(url).hostname,
      description: data.description || 'No description available',
      image: data.image?.url,
      favicon: data.logo?.url || `https://icons.duckduckgo.com/ip3/${new URL(url).hostname}.ico`,
      type: determineContentType(url, data),
      domain: new URL(url).hostname.replace('www.', ''),
      timestamp: Date.now(),
      platform: detectPlatform(url) as any,
      author: data.author,
      quality,
      metadataSource: 'microlink',
      imageValidated,
      descriptionSource: data.description ? 'meta' : 'generated',
      processingTime,
      retryCount: 0,
      lastUpdated: Date.now(),
    };

    return enhancedData;

  } catch (error) {
    console.log('Microlink API failed:', error);
    return null;
  }
}

/**
 * Determines content type based on URL and metadata
 */
function determineContentType(url: string, _data: any): LinkData['type'] {
  const domain = new URL(url).hostname.toLowerCase();
  
  // Social platforms
  if (domain.includes('twitter.com') || domain.includes('x.com')) return 'tweet';
  if (domain.includes('youtube.com') || domain.includes('youtu.be')) return 'video';
  if (domain.includes('instagram.com')) return 'instagram';
  if (domain.includes('tiktok.com')) return 'tiktok';
  
  // Content types
  if (domain.includes('medium.com') || domain.includes('substack.com') || 
      domain.includes('blog') || url.includes('/blog/') || 
      domain.includes('news') || url.includes('/article/')) {
    return 'article';
  }
  
  return 'link';
}

/**
 * Detects platform from URL
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
 * Enhanced link processing with multiple API fallbacks
 */
export async function processEnhancedLink(url: string, retryCount = 0): Promise<EnhancedLinkData> {
  // Check cache first
  const cached = enhancedCache.get(url);
  if (cached && retryCount === 0) {
    return cached;
  }

  const startTime = Date.now();
  let result: EnhancedLinkData | null = null;

  try {
    // Validate URL
    new URL(url);

    // Try LinkPreview.net API first
    result = await callLinkPreviewAPI(url);

    // Fallback to Microlink.io API
    if (!result || result.quality === 'poor') {
      const microlinkResult = await callMicrolinkAPI(url);
      if (microlinkResult && (!result || microlinkResult.quality > result.quality)) {
        result = microlinkResult;
      }
    }

    // If APIs failed or returned poor quality, fallback to HTML scraping
    if (!result || result.quality === 'poor') {
      // Import the original processLink function as fallback
      const { processLink } = await import('./link-processor');
      const fallbackData = await processLink(url);
      
      result = {
        ...fallbackData,
        quality: 'fair',
        metadataSource: 'html_scraping',
        imageValidated: false,
        descriptionSource: 'meta',
        processingTime: Date.now() - startTime,
        retryCount,
        lastUpdated: Date.now(),
      } as EnhancedLinkData;
    }

  } catch (error) {
    console.error('Enhanced link processing failed:', error);
    
    // Final fallback - basic data
    const domain = new URL(url).hostname.replace('www.', '');
    result = {
      url,
      title: domain,
      description: 'Vista previa no disponible',
      favicon: `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      type: 'link',
      domain,
      timestamp: Date.now(),
      platform: 'generic',
      quality: 'poor',
      metadataSource: 'fallback',
      imageValidated: false,
      descriptionSource: 'generated',
      processingTime: Date.now() - startTime,
      retryCount,
      lastUpdated: Date.now(),
    };
  }

  // Cache the result
  if (result) {
    enhancedCache.set(url, result);
  }

  return result!;
}

/**
 * Process multiple links concurrently with rate limiting
 */
export async function processEnhancedLinks(urls: string[]): Promise<EnhancedLinkData[]> {
  // Process in batches to respect rate limits
  const batchSize = 3;
  const results: EnhancedLinkData[] = [];
  
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchPromises = batch.map(url => processEnhancedLink(url));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Reprocess a link with fresh data (bypass cache)
 */
export async function reprocessEnhancedLink(url: string): Promise<EnhancedLinkData> {
  // Clear from cache first
  enhancedCache.clear();
  
  // Process with retry count
  return processEnhancedLink(url, 1);
}

/**
 * Get cache statistics
 */
export function getEnhancedCacheStats() {
  return enhancedCache.getStats();
}

/**
 * Clear enhanced cache
 */
export function clearEnhancedCache(): void {
  enhancedCache.clear();
}

/**
 * Check if enhanced processing is available (APIs configured)
 */
export function isEnhancedProcessingAvailable(): boolean {
  return !!(API_CONFIG.linkpreview.key && API_CONFIG.linkpreview.key !== 'your_linkpreview_api_key_here') ||
         !!(API_CONFIG.microlink.key && API_CONFIG.microlink.key !== 'your_microlink_api_key_here');
}