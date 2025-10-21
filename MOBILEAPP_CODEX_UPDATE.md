# MobileApp - Actualización Codex con Nueva Estructura

## 📋 Resumen
La MobileApp ha sido actualizada para enviar bookmarks al Codex con la nueva estructura de categorización (General, Monitoreos, Wiki).

## ✅ Cambios Implementados

### 1. **Tipos y Interfaces** (`src/types/codexTypes.ts`) ✨ NUEVO ARCHIVO
- **Categorías**: `general`, `monitoring`, `wiki`
- **Subcategorías por categoría**:
  - **General**: `document`, `audio`, `video`, `external_spreadsheet`
  - **Monitoring**: `activity`, `post`, `internal_spreadsheet`
  - **Wiki**: `person`, `entity`, `organization`, `event`, `concept`
- **Metadata estructurada** con campos específicos por tipo de contenido
- **Función `detectCodexCategory()`**: Detecta automáticamente la categoría correcta

### 2. **SavedStore** (`src/state/savedStore.ts`)
Campos añadidos a `SavedItem`:
```typescript
codex_category?: 'general' | 'monitoring' | 'wiki';
codex_subcategory?: string;
codex_metadata?: Record<string, any>;
```

### 3. **Servicio Codex** (`src/services/codexService.ts`)

#### Función `saveLinkToCodex()` actualizada:
```typescript
export async function saveLinkToCodex(
  userId: string, 
  item: SavedItem, 
  category?: CodexCategory,  // Opcional
  subcategory?: CodexSubcategory,  // Opcional
  metadata?: CodexItemMetadata  // Opcional
): Promise<CodexSaveResult>
```

**Comportamiento**:
- ✅ **Detección automática**: Si no se proporcionan categorías, detecta automáticamente según el contenido
- ✅ **Prioriza posts**: Todos los bookmarks de Instagram, Twitter/X, TikTok → `monitoring/post`
- ✅ **Metadata inteligente**: Extrae engagement, platform, author, etc.
- ✅ **Compatible con backend nuevo**: Envía estructura completa con `category`, `subcategory`, `metadata`

#### Función `saveRecordingToCodex()` actualizada:
```typescript
export async function saveRecordingToCodex(
  userId: string, 
  recording: Recording, 
  category?: CodexCategory,  // Opcional
  subcategory?: CodexSubcategory,  // Opcional
  metadata?: CodexItemMetadata  // Opcional
): Promise<CodexSaveResult>
```

**Comportamiento**:
- ✅ **Automático para audios**: Detecta como `general/audio`
- ✅ **Metadata específica**: Incluye `duration`, `transcription`, `audio_format`

## 🎯 Lógica de Detección Automática

### Prioridad de Detección:

1. **Posts de Redes Sociales** (PRIORIDAD MÁXIMA)
   - Platform: `instagram`, `twitter`, `x` → `monitoring/post`
   - URL contiene: `instagram.com`, `twitter.com`, `x.com`, `tiktok.com` → `monitoring/post`

2. **Mapeo por Tipo**
   - `audio` → `general/audio`
   - `video` → `general/video`
   - `document` → `general/document`

3. **Detección por Dominio**
   - YouTube, Vimeo → `general/video`
   - SoundCloud, Spotify → `general/audio`
   - Google Sheets, Excel → `general/external_spreadsheet`

4. **Fallback**
   - Por defecto → `monitoring/post` (ya que la mayoría son bookmarks de posts)

## 📊 Estructura de Metadata por Tipo

### Posts de Redes Sociales (`monitoring/post`)
```typescript
{
  source_type: 'instagram' | 'tweet',
  platform: 'instagram' | 'twitter' | 'x',
  author: string,
  post_id: string,
  engagement_metrics: {
    likes?: number,
    comments?: number,
    shares?: number,
    views?: number
  }
}
```

### Audio (`general/audio`)
```typescript
{
  source_type: 'audio',
  platform: 'audio',
  duration: number,
  audio_format: 'm4a',
  transcription?: string
}
```

### Videos (`general/video`)
```typescript
{
  source_type: 'video',
  platform: string,
  video_duration?: number,
  resolution?: string
}
```

## 🔄 Flujo de Guardado

### Para Bookmarks (Posts):
```
Usuario guarda bookmark
    ↓
SavedItemCard → "Guardar en Codex"
    ↓
saveLinkToCodex(userId, item)  // Sin parámetros adicionales
    ↓
detectCodexCategory(item) → { category: 'monitoring', subcategory: 'post' }
    ↓
Construir metadata con engagement
    ↓
POST /api/codex/save-link(-pulse) con nueva estructura
    ↓
Backend guarda en codex_items con category/subcategory/metadata
```

### Para Audios:
```
Usuario graba audio
    ↓
RecordingScreen → "Guardar en Codex"
    ↓
saveRecordingToCodex(userId, recording)  // Sin parámetros adicionales
    ↓
Detección automática → { category: 'general', subcategory: 'audio' }
    ↓
Construir metadata con duration, transcription
    ↓
POST /api/codex/save-recording(-pulse) con nueva estructura
    ↓
Backend guarda en codex_items
```

## 🚀 Compatibilidad con Backend

### Endpoints Utilizados:

#### Con Supabase Session:
- `POST /api/codex/save-link`
- `POST /api/codex/save-recording`

#### Sin Supabase Session (Pulse Auth):
- `POST /api/codex/save-link-pulse`
- `POST /api/codex/save-recording-pulse`

### Estructura de Request Enviada:
```typescript
{
  user_id: string,
  pulse_user_email?: string,  // Solo para endpoints -pulse
  item_data: {
    url: string,
    title: string,
    description: string,
    category: 'general' | 'monitoring' | 'wiki',
    subcategory: string,
    metadata: CodexItemMetadata,
    // Campos adicionales
    platform?: string,
    image?: string,
    author?: string,
    domain?: string,
    type?: string,
    timestamp?: number,
    engagement?: { likes, comments, shares, views }
  }
}
```

## ✨ Características Clave

1. **✅ Detección Automática**: No requiere interacción del usuario para categorizar
2. **✅ Inteligente**: Prioriza posts de redes sociales correctamente
3. **✅ Metadata Rica**: Extrae y envía engagement, author, platform automáticamente
4. **✅ Retrocompatible**: Funciona con ambos sistemas de autenticación (Supabase + Pulse)
5. **✅ Flexible**: Permite categorización manual si se necesita en el futuro
6. **✅ Sin UI adicional**: No requiere modales ni selección manual

## 🧪 Testing

Para probar la integración:

1. **Bookmark de Instagram**:
   - Guardar un post de Instagram
   - Verificar que se guarde como `monitoring/post`
   - Verificar metadata con `engagement_metrics`

2. **Bookmark de Twitter/X**:
   - Guardar un tweet
   - Verificar que se guarde como `monitoring/post`
   - Verificar metadata con `post_id` y `engagement_metrics`

3. **Grabación de Audio**:
   - Grabar un audio con transcripción
   - Verificar que se guarde como `general/audio`
   - Verificar metadata con `duration` y `transcription`

## 📝 Notas Importantes

- **Todos los bookmarks de posts se guardan automáticamente como `monitoring/post`**
- **No se requiere interacción del usuario para categorizar**
- **La categoría se detecta basada en platform, URL y tipo de contenido**
- **La metadata se construye automáticamente según el tipo de contenido**
- **El backend debe estar actualizado para recibir la nueva estructura**

## 🔧 Próximos Pasos

El backend en ExtractorW debe:
1. ✅ Actualizar endpoints `/api/codex/save-link` y `/api/codex/save-link-pulse`
2. ✅ Actualizar endpoints `/api/codex/save-recording` y `/api/codex/save-recording-pulse`
3. ✅ Validar que reciben `category`, `subcategory`, `metadata`
4. ✅ Guardar en tabla `codex_items` con nuevas columnas

---

**Fecha de actualización**: 21 de octubre, 2025
**Versión**: 1.0.0
**Status**: ✅ Completo y listo para testing

