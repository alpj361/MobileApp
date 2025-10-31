/**
 * Web Polyfills
 * Fixes compatibility issues for web platform only
 * Does NOT affect iOS/Android native code
 */

// Polyfill for import.meta (required by some npm packages on web)
if (typeof window !== 'undefined' && !('import' in window)) {
  // Create a proxy for import.meta
  const importMetaProxy = {
    url: typeof window !== 'undefined' ? window.location.href : '',
    env: typeof process !== 'undefined' ? process.env : {},
  };

  // Try to polyfill if possible
  try {
    if (typeof globalThis !== 'undefined') {
      Object.defineProperty(globalThis, 'import', {
        value: { meta: importMetaProxy },
        writable: false,
        configurable: false,
      });
    }
  } catch (e) {
    // Silent fail - some environments don't allow this
    console.warn('[Web Polyfill] Could not polyfill import.meta:', e.message);
  }
}

// Ensure process.env exists for web
if (typeof window !== 'undefined' && typeof process === 'undefined') {
  window.process = { env: {} };
}

console.log('[Web Polyfills] Loaded for platform: web');

