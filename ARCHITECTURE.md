# Architecture Documentation - MobileApp (Mandatory Reading)

## Overview

Esta app es una **aplicación React Native universal** que funciona en **iOS nativo** y **Web** usando Expo. Procesa links de redes sociales (X/Twitter, Instagram) con análisis de contenido, transcripción y engagement metrics.

---

## Backend Architecture

### Servicios Backend

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA BACKEND                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (iOS/Web)                                          │
│         │                                                    │
│         ├─► ExtractorT (api.standatpd.com)                   │
│         │   Puerto: 443 (HTTPS)                             │
│         │   Endpoints:                                       │
│         │   - /enhanced-media/process                        │
│         │   - /process (legacy)                              │
│         │                                                    │
│         │   Función: Procesa URLs de X/Twitter              │
│         │   - Extrae media (videos, imágenes)               │
│         │   - Obtiene métricas (likes, shares, views)       │
│         │   - Transcribe videos (con Whisper)               │
│         │   - Analiza imágenes (con Vision)                 │
│         │   - Extrae comentarios                            │
│         │                                                    │
│         └─► ExtractorW (server.standatpd.com)               │
│             Puerto: 443 (HTTPS)                              │
│             Endpoints:                                       │
│             - /api/x/media                                   │
│             - /api/x/comments                                │
│             - /api/vizta-chat/*                              │
│                                                              │
│             Función: Servicios legacy + proxy               │
│             NO se usa para X/Twitter en la app actual       │
│             (solo fallbacks)                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### URL Configuration

**ExtractorT (Principal para X/Twitter)**
- **Producción**: `https://api.standatpd.com`
- **Endpoint principal**: `/enhanced-media/process`
- **Configuración**: `src/services/xCompleteService.ts` línea 5
- **Variable env**: `EXPO_PUBLIC_EXTRACTORT_URL` (fallback: 'https://api.standatpd.com')

**ExtractorW (Legacy/Fallbacks)**
- **Producción**: `https://server.standatpd.com`
- **Configuración**: `src/config/backend.ts`
- **Variable env**: `EXPO_PUBLIC_EXTRACTORW_URL`

---

## Platform-Specific Behavior

### iOS Native
```typescript
Platform.OS === 'ios'
```
- ✅ Fetch directo a URLs sin restricciones CORS
- ✅ Puede llamar directamente a x.com, instagram.com
- ✅ Usa ExtractorT directamente vía HTTPS público
- ✅ React Native networking nativo

### Web Browser
```typescript
Platform.OS === 'web'
```
- ⚠️ Restricciones CORS del navegador
- ❌ NO puede hacer fetch directo a x.com (CORS blocked)
- ✅ Usa ExtractorT directamente (bypass fetch a x.com)
- ✅ Mismo código que iOS, pero con skip de HTML scraping

---

## Flow Diagrams

### X/Twitter Link Processing

```
┌─────────────────────────────────────────────────────────────┐
│             PROCESAMIENTO DE LINK DE X/TWITTER              │
└─────────────────────────────────────────────────────────────┘

Usuario pega URL de X/Twitter
         │
         ▼
    SavedScreen.tsx:handlePasteFromClipboard()
         │
         ▼
    savedStore.ts:addSavedItem()
         │
         ├─► improved-link-processor.ts:processImprovedLink()
         │   │
         │   ├─► detectPlatform() → 'twitter'
         │   │
         │   ├─► Platform.OS === 'web' && isXTwitter?
         │   │   YES → Skip fetch directo (CORS bypass)
         │   │   NO  → Fetch HTML de x.com
         │   │
         │   └─► fetchXComplete() [xCompleteService.ts]
         │       │
         │       └─► POST https://api.standatpd.com/enhanced-media/process
         │           Body: {
         │             url: "https://x.com/user/status/123",
         │             transcribe: true,
         │             save_to_codex: false
         │           }
         │           │
         │           ▼
         │       ExtractorT procesa y retorna:
         │       {
         │         success: true,
         │         content: { tweet_text, author, ... },
         │         media_files: [...],
         │         transcription: "...",
         │         metrics: { likes, replies, reposts, views }
         │       }
         │
         └─► savedStore.ts guarda item con engagement data
```

### Web vs iOS Difference (Critical)

```
┌─────────────────────────────────────────────────────────────┐
│                  DIFERENCIA CLAVE: WEB vs iOS               │
└─────────────────────────────────────────────────────────────┘

iOS:
  User → improved-link-processor.ts
           │
           ├─► fetch('https://x.com/...') ✅ OK (no CORS)
           │   → Parse HTML → extract basic metadata
           │
           └─► fetchXComplete() → ExtractorT → Full data

Web:
  User → improved-link-processor.ts
           │
           ├─► Platform.OS === 'web' detected
           │   → SKIP fetch to x.com (CORS bypass)
           │   → html = '' (empty)
           │
           └─► fetchXComplete() → ExtractorT → Full data
                 └─► Toda la data viene de ExtractorT
```

---

## Key Files

### Core Services

1. **`src/services/xCompleteService.ts`** (CRITICAL)
   - Servicio unificado para X/Twitter
   - Llama a ExtractorT `/enhanced-media/process`
   - Retorna: media, comments, metrics, transcription
   - NO modificar sin entender el flujo completo

2. **`src/api/improved-link-processor.ts`**
   - Procesa cualquier URL (X, Instagram, generic)
   - Línea 1398-1405: CORS bypass para web + X/Twitter
   - Línea 1489-1562: Procesamiento específico de X/Twitter

3. **`src/state/savedStore.ts`**
   - Store de Zustand para items guardados
   - Maneja procesamiento async de links
   - Auto-análisis para posts de X/Twitter

### Configuration Files

4. **`src/config/backend.ts`**
   - Configuración de URLs de backend
   - Platform-aware (web vs native)
   - **IMPORTANTE**: No cambiar sin verificar ambas plataformas

5. **`src/config/api.ts`**
   - Headers comunes para requests
   - Platform header (`X-Platform: mobile-ios` o `mobile-web`)

---

## Common Issues & Solutions

### Issue 1: Web muestra engagement = 0
**Causa**: ExtractorT no responde o timeout
**Debug**:
```typescript
// En xCompleteService.ts línea 82+
console.log('[X Complete] 📤 Calling ExtractorT...');
console.log('[X Complete] Request body:', requestBody);
```
**Verificar**:
1. Network tab en DevTools → ver status code
2. Logs de ExtractorT en servidor → ver si llega request
3. nginx config → verificar proxy_pass correcto

### Issue 2: CORS error en web
**Causa**: Fetch directo a x.com desde navegador
**Solución**: Ya implementado en líneas 1398-1445 de improved-link-processor.ts
```typescript
const shouldSkipDirectFetch = isWeb && isXTwitter;
if (!shouldSkipDirectFetch) {
  // Fetch HTML solo en iOS
}
```

### Issue 3: iOS funciona, Web no
**Checklist**:
1. ✅ Verificar que web use mismo `EXTRACTORT_URL`
2. ✅ Hard refresh navegador (Cmd+Shift+R)
3. ✅ Verificar Network tab → endpoint correcto
4. ✅ Verificar que no haya fetch a localhost (debe ser api.standatpd.com)

### Issue 4: Timeout en requests
**Causa**: ExtractorT tarda >30s procesando
**Solución temporal**: Aumentar timeout en xCompleteService.ts
```typescript
// NO recomendado - mejor optimizar ExtractorT
const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s
```

---

## Development Workflow

### Adding New Platform (e.g., TikTok)

1. **Agregar detección en `improved-link-processor.ts`**
   ```typescript
   function detectPlatform(url: string): string {
     if (domain.includes('tiktok.com')) return 'tiktok';
   }
   ```

2. **Crear servicio específico** (e.g., `tiktokCompleteService.ts`)
   - Seguir patrón de `xCompleteService.ts`
   - Usar caché con `getXDataFromCache/setXDataToCache`

3. **Agregar caso en processor**
   ```typescript
   else if (platform === 'tiktok') {
     const { fetchTikTokComplete } = await import('./tiktokCompleteService');
     const data = await fetchTikTokComplete(url);
     // ... process data
   }
   ```

4. **Verificar en ambas plataformas**
   - iOS: `npm run ios`
   - Web: `npm start` → localhost:8081

### Debugging Network Issues

**iOS Simulator:**
```bash
# Ver logs de network
xcrun simctl spawn booted log stream --predicate 'subsystem contains "NSURLSession"'
```

**Web Browser:**
1. DevTools → Network tab
2. Filter: XHR
3. Look for: `api.standatpd.com` requests
4. Check: Status, Headers, Response

**Server Logs:**
```bash
# ExtractorT
ssh server "cd ExtractorT && docker-compose logs -f --tail=100"

# ExtractorW
ssh server "cd ExtractorW && docker-compose logs -f --tail=100"
```

---

## Environment Variables

### Required `.env` variables

```bash
# Backend URLs (production)
EXPO_PUBLIC_EXTRACTORW_URL=https://server.standatpd.com
EXPO_PUBLIC_EXTRACTORT_URL=https://api.standatpd.com

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx

# OpenAI
EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY=sk-proj-xxx
```

### Optional (desarrollo local)

```bash
# Si quieres usar ExtractorW local en web
EXPO_PUBLIC_EXTRACTORW_URL_LOCAL=http://localhost:3010

# NO uses ExtractorT local - siempre remoto
# EXTRACTORT siempre debe ser api.standatpd.com
```

---

## Testing Checklist

Antes de commit, verificar:

- [ ] iOS: Link de X/Twitter procesa correctamente
- [ ] Web: Link de X/Twitter procesa correctamente
- [ ] Web: No hay CORS errors en consola
- [ ] Engagement metrics se muestran (likes, views, etc)
- [ ] No hay fetch a localhost en producción
- [ ] Network tab muestra requests a api.standatpd.com
- [ ] Logs de servidor muestran requests llegando

---

## Performance Considerations

### Caching Strategy

**xDataCache** (`src/storage/xDataCache.ts`):
- TTL: 6 horas para social media
- Key format: `complete:${url}`
- Storage: MMKV (iOS) / localStorage (Web)

**Link Cache** (improved-link-processor.ts):
- Max size: 500 items
- Auto-cleanup de entries viejos
- Cache por URL completa

### Request Optimization

1. **Una sola llamada a ExtractorT** por link
   - No múltiples requests para mismo post
   - fetchXComplete retorna TODO: media, comments, metrics

2. **Deduplicate simultaneous requests**
   - savedStore previene procesamiento duplicado
   - Ver `pendingUrls` Set en savedStore.ts

---

## Security Notes

- ✅ Bearer tokens en headers (ExtractorW)
- ✅ HTTPS only en producción
- ✅ No credenciales en frontend
- ✅ Rate limiting en ExtractorT
- ⚠️ NO commit `.env` con API keys reales

---

## Contact & Support

- **Backend Issues**: Verificar logs de servidor primero
- **Frontend Issues**: Revisar este doc + git history
- **CORS Issues**: Problema de configuración, no de código
- **Performance**: Revisar caching + ExtractorT response time

---

**Última actualización**: 2025-10-31
**Versión**: 1.0.0
**Mantenido por**: Development Team

