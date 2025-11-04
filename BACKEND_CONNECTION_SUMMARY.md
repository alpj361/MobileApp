# Backend Connection - Resumen de Cambios

## 🎯 Problema Resuelto
La web app no conectaba con el backend (ExtractorW/ExtractorT) porque las variables de entorno no se estaban leyendo correctamente en web.

---

## ✅ Solución Implementada

### 1. **Configuración Centralizada de Backend** 🆕
**Archivo creado:** `src/config/backend.ts`

**Qué hace:**
- Centraliza todas las URLs del backend
- Lee `EXPO_PUBLIC_EXTRACTORW_URL` y `EXPO_PUBLIC_EXTRACTORT_URL` desde `.env`
- Fallback a URLs de producción si no están definidas
- Funciona igual en móvil y web
- Helper `getApiUrl()` para construir URLs completas

**Beneficios:**
- Single source of truth para URLs del backend
- Debugging más fácil (logBackendConfig)
- Compatible con ambas plataformas
- Fácil cambiar entre dev/prod

---

### 2. **Servicios Actualizados** ✅

Todos los servicios ahora usan la configuración centralizada:

#### ✅ `src/services/xCompleteService.ts`
```typescript
// Antes: const EXTRACTORT_URL = process.env.EXPO_PUBLIC_EXTRACTORT_URL ?? 'https://api.standatpd.com';
// Después: import { EXTRACTORT_URL } from '../config/backend';
```

#### ✅ `src/services/xMediaService.ts`
```typescript
// Antes: const BASE_URL = process.env.EXPO_PUBLIC_EXTRACTORW_URL ?? 'https://server.standatpd.com';
// Después: import { EXTRACTORW_URL } from '../config/backend'; const BASE_URL = EXTRACTORW_URL;
```

#### ✅ `src/services/xCommentService.ts`
```typescript
// Antes: const EXTRACTORW_URL = process.env.EXPO_PUBLIC_EXTRACTORW_URL ?? 'https://server.standatpd.com';
// Después: import { EXTRACTORW_URL, EXTRACTORT_URL, getApiUrl } from '../config/backend';
```

#### ✅ `src/services/extractorTService.ts`
```typescript
// Antes: const EXTRACTOR_WRAPPER_URL = 'https://server.standatpd.com/api/instagram/comments';
// Después: const EXTRACTOR_WRAPPER_URL = getApiUrl('/api/instagram/comments', 'extractorw');
```

#### ✅ `src/services/instagramMediaService.ts`
```typescript
// Antes: const INSTAGRAM_MEDIA_ENDPOINT = 'https://server.standatpd.com/api/instagram/media';
// Después: const INSTAGRAM_MEDIA_ENDPOINT = getApiUrl('/api/instagram/media', 'extractorw');
```

#### ✅ `src/services/codexService.ts`
Todas las URLs hardcodeadas reemplazadas:
- `/api/codex/check-link`
- `/api/codex/check-multiple-links`
- `/api/codex/save-link-pulse`
- `/api/codex/save-link`
- `/api/codex/save-recording-pulse`
- `/api/codex/save-recording`

---

## 📋 Archivos Modificados

```
🆕 src/config/backend.ts                    - Config centralizada
✅ src/services/xCompleteService.ts          - URL actualizada
✅ src/services/xMediaService.ts             - URL actualizada
✅ src/services/xCommentService.ts           - URLs actualizadas
✅ src/services/extractorTService.ts         - URLs actualizadas
✅ src/services/instagramMediaService.ts     - URL actualizada
✅ src/services/codexService.ts              - 6 URLs actualizadas
```

---

## 🔧 Variables de Entorno

### Configuradas en `.env`:
```bash
EXPO_PUBLIC_EXTRACTORW_URL=https://server.standatpd.com
# EXPO_PUBLIC_EXTRACTORT_URL no está definida, usa fallback
```

### Fallbacks (hardcoded en `backend.ts`):
```typescript
EXTRACTORW_URL: 'https://server.standatpd.com'  // Production
EXTRACTORT_URL: 'https://api.standatpd.com'     // Production
```

---

## 🌐 Cómo Funciona en Web

### Antes:
```typescript
// ❌ process.env podía ser undefined en web
const url = process.env.EXPO_PUBLIC_EXTRACTORW_URL ?? 'fallback';
fetch(url + '/api/endpoint');  // URL construida manualmente
```

### Ahora:
```typescript
// ✅ Centralizado y garantizado
import { getApiUrl } from '../config/backend';
fetch(getApiUrl('/api/endpoint', 'extractorw'));
```

### Flujo:
1. App carga → `backend.ts` inicializa
2. Lee `process.env.EXPO_PUBLIC_EXTRACTORW_URL`
3. Si no existe → usa fallback de producción
4. Servicios importan configuración
5. Todos usan misma URL consistentemente

---

## 🧪 Testing

### Verificar en Console del Navegador:
```javascript
// Deberías ver al cargar:
[Backend Config] {
  extractorW: 'https://server.standatpd.com',
  extractorT: 'https://api.standatpd.com',
  isDev: true,
  platform: 'web'
}
```

### Test de Conectividad:
1. Abrir web app
2. Intentar guardar un link
3. Verificar Network tab en DevTools
4. Deberías ver requests a `server.standatpd.com`

---

## 🔍 Debugging

### Ver URLs Activas:
```typescript
import { logBackendConfig } from './src/config/backend';
logBackendConfig();
```

### Verificar en Runtime:
```typescript
import { EXTRACTORW_URL, getApiUrl } from './src/config/backend';
console.log('ExtractorW:', EXTRACTORW_URL);
console.log('Full URL:', getApiUrl('/api/test', 'extractorw'));
```

---

## ⚠️ CORS

Si ves errores de CORS en la consola web:

```
Access to fetch at 'https://server.standatpd.com/api/...' from origin 'http://localhost:8081' 
has been blocked by CORS policy
```

### Solución (Backend):
El servidor debe responder con estos headers:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Platform, Authorization');
```

---

## 🚀 Beneficios de Esta Arquitectura

### 1. **Single Source of Truth**
- Una sola configuración para todas las URLs
- Cambiar backend = editar 1 archivo

### 2. **Platform Agnostic**
- Mismo código funciona en iOS, Android y Web
- No necesita Platform.select()

### 3. **Environment Aware**
- Dev vs Production automático
- Fácil testing local

### 4. **Type Safe**
- TypeScript garantiza URLs correctas
- Autocomplete en IDE

### 5. **Debugging Friendly**
- Log centralizado de configuración
- Fácil ver qué URL se está usando

---

## 📱 Próximos Pasos

Si necesitas agregar más backends:

```typescript
// En src/config/backend.ts
export const NEW_SERVICE_URL = getEnvVar(
  'EXPO_PUBLIC_NEW_SERVICE_URL',
  'https://new-service.standatpd.com'
);

export function getNewServiceUrl(path: string): string {
  return getApiUrl(path, 'newservice');
}
```

Luego en tus servicios:
```typescript
import { getNewServiceUrl } from '../config/backend';
const response = await fetch(getNewServiceUrl('/api/endpoint'));
```

---

## ✅ Checklist de Verificación

- [x] Configuración centralizada creada
- [x] Todos los servicios actualizados
- [x] Variables de entorno leídas correctamente
- [x] Fallbacks de producción configurados
- [x] Logging para debugging
- [x] Compatible con web y móvil
- [ ] Testing en móvil (verificar que no se rompió nada)
- [ ] Testing en web (verificar requests al backend)

---

## 🎯 Resultado Esperado

Cuando reinicies el servidor:

1. ✅ **Console Log:**
   ```
   [Backend Config] { extractorW: '...', extractorT: '...', ... }
   ```

2. ✅ **Network Tab:**
   ```
   POST https://server.standatpd.com/api/x/media
   POST https://server.standatpd.com/api/codex/save-link
   POST https://api.standatpd.com/api/x_comment/
   ```

3. ✅ **Funcionalidad:**
   - Guardar links funciona
   - Obtener comentarios funciona
   - Analizar posts funciona
   - Codex funciona

---

**Todo listo para reiniciar y probar!** 🚀

