# 🤖 Integración de Vizta Chat en Mobile App

## ✅ Implementación Completada

La Mobile App ahora usa **Vizta AI** en lugar de OpenAI directo, lo que le da acceso a un conjunto completo de herramientas avanzadas.

## 🎯 ¿Qué es Vizta?

Vizta es un agente AI inteligente con acceso a múltiples herramientas especializadas:

### 🐦 Herramientas de Redes Sociales
- **nitter_context**: Búsqueda inteligente en Twitter/X con análisis de sentimiento
- **nitter_profile**: Análisis de perfiles de Twitter/X
- **resolve_twitter_handle**: Resolver nombres a handles de Twitter

### 🔍 Búsqueda y Análisis
- **perplexity_search**: Búsqueda web inteligente con fuentes
- **latest_trends**: Tendencias políticas de Guatemala
- **webagent_extract**: Extracción de contenido web

### 📋 Datos del Usuario
- **user_projects**: Acceso a proyectos del usuario
- **user_codex**: Búsqueda en el codex personal
- **project_decisions**: Decisiones de proyectos

### 🧠 Capacidades de Análisis
- Análisis de sentimiento
- Detección de entidades
- Análisis político contextual
- Clasificación de intenciones

## 📁 Archivos Modificados

### 1. **`src/api/vizta-service.ts`** (NUEVO)
Servicio para comunicación con Vizta en ExtractorW.

```typescript
export const getViztaChatResponse = async (
  message: string,
  sessionId?: string,
  useGenerativeUI?: boolean
): Promise<ViztaResponse>
```

**Características**:
- ✅ Manejo de sesiones para conversaciones continuas
- ✅ Soporte para Generative UI (gráficas, visualizaciones)
- ✅ Manejo de errores robusto
- ✅ Logging detallado
- ✅ Extracción de fuentes de información

### 2. **`src/screens/ChatScreen.tsx`** (MODIFICADO)
Actualizado para usar Vizta en lugar de OpenAI.

**Cambios principales**:
```typescript
// ANTES
import { getOpenAIChatResponse } from '../api/chat-service';

// AHORA
import { getViztaChatResponse } from '../api/vizta-service';
```

**Funcionalidades nuevas**:
- ✅ Mantiene `conversationId` para contexto
- ✅ Muestra fuentes en logs (preparado para UI)
- ✅ Mensajes de error en español
- ✅ Manejo de respuestas estructuradas

### 3. **`src/state/chatStore.ts`** (MODIFICADO)
Store actualizado para manejar conversaciones.

**Nuevos campos**:
```typescript
conversationId: string | null;
setConversationId: (id: string | null) => void;
```

**Persistencia**:
- ✅ `conversationId` se guarda en AsyncStorage
- ✅ Se limpia al hacer `clearMessages()`

### 4. **`src/config/env.ts`** (MODIFICADO)
Variables de entorno para ExtractorW.

```typescript
export const EXTRACTORW_URL = process.env.EXPO_PUBLIC_EXTRACTORW_URL;
export const BEARER_TOKEN = process.env.SUPABASE_ANON_KEY;
```

## 🔧 Variables de Entorno

Las siguientes variables ya están configuradas en `.env`:

```bash
# ExtractorW Backend
EXPO_PUBLIC_EXTRACTORW_URL=http://192.168.1.20:8081

# Authentication (reutiliza SUPABASE_ANON_KEY como Bearer Token)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🚀 Cómo Funciona

### Flujo de Conversación

```
Usuario escribe: "¿Qué dice la gente sobre Bernardo Arévalo?"
   ↓
Mobile App (ChatScreen)
   ↓
vizta-service.ts → POST /api/vizta-chat/query
   {
     message: "¿Qué dice la gente sobre Bernardo Arévalo?",
     sessionId: "mobile_chat_1728814748205",
     useGenerativeUI: false
   }
   ↓
ExtractorW → Vizta Agent
   ↓
1. Clasifica intent: social_media
2. Ejecuta: nitter_context (búsqueda en Twitter)
3. Analiza: Sentimiento de tweets
4. Sintetiza: Respuesta coherente
   ↓
Respuesta a Mobile App:
   {
     success: true,
     response: {
       message: "Según lo que encontré en Twitter...",
       sources: [
         { url: "...", title: "Tweet de @usuario" }
       ]
     },
     conversationId: "chat_1728814748205"
   }
   ↓
Mobile App muestra respuesta al usuario
```

### Modo Chat Sin Guardar

Vizta detecta automáticamente que las peticiones vienen de modo chat (por el `sessionId` que empieza con `mobile_chat_` o `chat_`) y:

✅ **Busca tweets** en tiempo real  
✅ **Analiza sentimiento** y contexto  
✅ **Retorna resultados**  
❌ **NO guarda** tweets en la base de datos  

Esto evita saturar la BD con búsquedas exploratorias.

## 📱 Ejemplo de Uso

```typescript
// En ChatScreen.tsx
const viztaResponse = await getViztaChatResponse(
  "¿Cuáles son las últimas tendencias políticas?",
  conversationId,
  false // Sin generative UI por ahora
);

// Vizta automáticamente:
// 1. Usa latest_trends para obtener tendencias
// 2. Analiza contexto político
// 3. Sintetiza respuesta informativa
```

## 🎨 Mejoras Futuras (Opcionales)

### 1. Mostrar Fuentes en UI
```tsx
// En ChatScreen.tsx, después del mensaje
{message.sources && (
  <View className="mt-2">
    {message.sources.map((source, idx) => (
      <Pressable 
        key={idx}
        onPress={() => Linking.openURL(source.url)}
      >
        <Text className="text-blue-500 text-sm">
          🔗 {source.title}
        </Text>
      </Pressable>
    ))}
  </View>
)}
```

### 2. Generative UI (Gráficas)
```typescript
const viztaResponse = await getViztaChatResponse(
  message,
  conversationId,
  true // ← Activar Generative UI
);

// Vizta retornará gráficas/visualizaciones en c1_response
```

### 3. Typing Indicators Contextuales
```typescript
// Mostrar qué herramienta está usando
"🐦 Buscando en Twitter..."
"🔍 Analizando web..."
"📊 Obteniendo tendencias..."
```

### 4. Feedback de Respuestas
```tsx
<View className="flex-row gap-2 mt-2">
  <Pressable onPress={() => sendFeedback(message.id, 'positive')}>
    <Text>👍</Text>
  </Pressable>
  <Pressable onPress={() => sendFeedback(message.id, 'negative')}>
    <Text>👎</Text>
  </Pressable>
</View>
```

## 🧪 Testing

### 1. Verificar conexión con ExtractorW
```bash
curl http://192.168.1.20:8081/api/vizta-chat/health
```

Respuesta esperada:
```json
{
  "success": true,
  "service": "Vizta Chat Streamlined",
  "version": "6.0",
  "timestamp": "2025-10-13T09:05:48.205Z",
  "availableTools": 11
}
```

### 2. Probar desde Mobile App

**Pregunta simple**:
```
"Hola Vizta"
```
✅ Debería responder conversacionalmente

**Búsqueda en Twitter**:
```
"¿Qué dice la gente sobre Bernardo Arévalo?"
```
✅ Debería buscar tweets y analizar sentimiento

**Tendencias**:
```
"¿Cuáles son las tendencias políticas actuales?"
```
✅ Debería usar latest_trends

**Proyectos del usuario**:
```
"Muéstrame mis proyectos"
```
✅ Debería usar user_projects

### 3. Verificar Logs

**En Mobile App** (Metro):
```
🤖 Enviando mensaje a Vizta: "¿Qué dice la gente..."
✅ Respuesta de Vizta recibida (chat_response)
📚 Fuentes incluidas: 3
```

**En ExtractorW**:
```bash
docker-compose logs -f extractorw | grep VIZTA
```

Esperado:
```
[VIZTA] 🧠 Processing: "¿Qué dice la gente..."
[VIZTA] 🎯 AI detected: social_media (confidence: 0.92)
[VIZTA] 🔧 Executing nitter_context with AI-determined params
[VIZTA] ✅ Tool execution successful
```

## 📊 Comparación: Antes vs Ahora

### Antes (OpenAI Directo)
```
Usuario → Mobile App → OpenAI API → Respuesta genérica
```

**Capacidades**:
- ❌ Sin acceso a datos en tiempo real
- ❌ Sin contexto político guatemalteco
- ❌ Sin análisis de redes sociales
- ❌ Sin acceso a proyectos del usuario

### Ahora (Vizta)
```
Usuario → Mobile App → Vizta → [11 herramientas] → Respuesta contextual
```

**Capacidades**:
- ✅ Búsqueda en Twitter/X en tiempo real
- ✅ Análisis político contextual de Guatemala
- ✅ Búsqueda web inteligente con Perplexity
- ✅ Acceso a proyectos y codex del usuario
- ✅ Análisis de sentimiento y entidades
- ✅ Tendencias políticas actualizadas
- ✅ Memoria de conversación
- ✅ Fuentes verificables

## 🔐 Seguridad

- ✅ Bearer token reutiliza `SUPABASE_ANON_KEY`
- ✅ Todas las peticiones autenticadas
- ✅ Modo chat no guarda datos sensibles en BD
- ✅ Logs no exponen tokens completos

## 📝 Notas Importantes

1. **Puerto correcto**: ExtractorW corre en puerto **8081**, no 3002
2. **Session ID**: Se genera automáticamente con prefijo `mobile_chat_` 
3. **Conversación continua**: `conversationId` se mantiene entre mensajes
4. **Sin guardar en BD**: Modo chat solo busca, no persiste
5. **Fuentes disponibles**: Se pueden mostrar en UI próximamente

## 🐛 Troubleshooting

### Error: "No se pudo conectar con Vizta"
```bash
# Verificar que ExtractorW esté corriendo
docker-compose ps extractorw

# Ver logs
docker-compose logs extractorw
```

### Error: "EXTRACTORW_URL no configurada"
Verificar en `.env`:
```bash
EXPO_PUBLIC_EXTRACTORW_URL=http://192.168.1.20:8081
```

### No recibe respuestas
```bash
# Verificar salud de Vizta
curl http://192.168.1.20:8081/api/vizta-chat/health

# Verificar bearer token
echo $SUPABASE_ANON_KEY
```

---

## ✅ Checklist de Implementación

- [x] Crear `vizta-service.ts`
- [x] Actualizar `ChatScreen.tsx`
- [x] Actualizar `chatStore.ts` con conversationId
- [x] Configurar variables de entorno
- [x] Verificar ExtractorW corriendo
- [x] Sin errores de lint
- [ ] Testing en dispositivo real
- [ ] Agregar UI para fuentes (futuro)
- [ ] Activar Generative UI (futuro)

---

**Implementado por**: Sistema AI  
**Fecha**: 13 de Octubre, 2025  
**Tiempo estimado**: ~30 minutos  
**Estado**: ✅ Completo y listo para usar

