/**
 * Caché global compartida para datos de X/Twitter
 * Evita llamadas duplicadas a ExtractorW cuando múltiples componentes
 * solicitan los mismos datos simultáneamente
 */

// ⚠️ Incrementar CACHE_VERSION cuando se cambia el formato de datos
const CACHE_VERSION = 2; // v2: incluye transcripción correcta de videos

interface CachedXData {
  data: any;
  timestamp: number;
  expiresAt: number;
  version: number;
}

// Caché en memoria (se pierde al recargar la app, pero eso está bien para evitar duplicación)
const xDataCache = new Map<string, CachedXData>();

// TTL por defecto: 5 minutos
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * Obtener datos de X desde la caché si están disponibles y no han expirado
 */
export function getXDataFromCache(url: string): any | null {
  const cached = xDataCache.get(url);

  if (!cached) {
    return null;
  }

  // ✅ Verificar versión - invalidar cache si es de versión vieja
  if (cached.version !== CACHE_VERSION) {
    console.log('[X Cache] Cache version mismatch - invalidating:', cached.version, '!==', CACHE_VERSION);
    xDataCache.delete(url);
    return null;
  }

  // Verificar si expiró
  if (Date.now() >= cached.expiresAt) {
    xDataCache.delete(url);
    return null;
  }

  return cached.data;
}

/**
 * Guardar datos de X en la caché
 */
export function setXDataToCache(url: string, data: any, ttl: number = DEFAULT_TTL_MS): void {
  xDataCache.set(url, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
    version: CACHE_VERSION,
  });
}

/**
 * Limpiar toda la caché (útil para testing o cuando se necesite)
 */
export function clearXDataCache(): void {
  xDataCache.clear();
}

/**
 * Eliminar entrada específica de la caché
 */
export function deleteXDataFromCache(url: string): boolean {
  return xDataCache.delete(url);
}

/**
 * Obtener estadísticas de la caché
 */
export function getXCacheStats(): {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
} {
  const now = Date.now();
  let validCount = 0;
  let expiredCount = 0;
  
  for (const [_, cached] of xDataCache.entries()) {
    if (now < cached.expiresAt) {
      validCount++;
    } else {
      expiredCount++;
    }
  }
  
  return {
    totalEntries: xDataCache.size,
    validEntries: validCount,
    expiredEntries: expiredCount,
  };
}






