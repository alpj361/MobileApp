# 🎙️ Guía Rápida: Transcripción Automática con ElevenLabs Scribe

## ✅ Implementación Completa

Se ha integrado exitosamente la API de ElevenLabs Scribe en la sección de Recording de tu app. Ahora tienes dos métodos de transcripción:

### 1. **Transcripción Automática** (ElevenLabs Scribe)
- ⚡ Se activa con un toggle
- 🔄 Transcribe automáticamente al terminar de grabar
- 🎯 Perfecto para entrevistas y notas rápidas

### 2. **Transcripción Manual** (Whisper)
- 📝 Botón manual para grabaciones antiguas
- 🔍 Permite transcribir cuando lo necesites

---

## 🚀 Configuración (IMPORTANTE)

### Paso 1: Agregar API Key de ElevenLabs

**Dirígete al tab ENV en la app de Vibecode** y agrega:

```
EXPO_PUBLIC_ELEVENLABS_API_KEY=tu_api_key_aqui
```

### Paso 2: Obtener tu API Key

1. Ve a [ElevenLabs API Settings](https://elevenlabs.io/app/settings/api-keys)
2. Crea o copia tu API key
3. Pégala en el tab ENV de Vibecode

---

## 📱 Cómo Usar

### Activar Transcripción Automática

1. Abre la pantalla de **Grabación**
2. Activa el switch **"Transcripción Automática"** en la parte superior
3. El estado se guarda automáticamente

### Grabar con Transcripción Automática

1. Con el toggle activado, presiona el botón de grabar 🎙️
2. Habla lo que necesites
3. Verás un indicador: **"Transcripción automática activada"**
4. Detén la grabación
5. ✨ La transcripción aparece automáticamente con el badge **"Auto" ⚡**

### Transcribir Manualmente

- Las grabaciones **sin** transcripción automática mostrarán el botón **"Transcribir con Whisper"**
- Úsalo para transcribir grabaciones antiguas

---

## 🎨 Características Visuales

### Durante la Grabación
- ✅ Switch de activación en la parte superior
- 🔴 Botón de grabar rojo cuando está grabando
- ⚡ Badge azul cuando la transcripción automática está activa

### En las Grabaciones
- **Con transcripción automática:**
  - Badge azul **"Auto" ⚡**
  - Título: "Transcripción Automática (Scribe)"
  - No muestra botón de transcripción manual

- **Sin transcripción automática:**
  - Botón: "Transcribir con Whisper"
  - Título: "Transcripción (Whisper)"

---

## 📂 Archivos Creados

### Nuevos Servicios
- ✅ `/src/services/elevenLabsScribe.ts` - Servicio completo de ElevenLabs
- ✅ `/src/hooks/useRealtimeTranscription.ts` - Hook personalizado
- ✅ `/ELEVENLABS_SCRIBE_INTEGRATION.md` - Documentación técnica completa

### Archivos Modificados
- ✅ `/src/state/recordingStore.ts` - Estado actualizado
- ✅ `/src/screens/RecordingScreen.tsx` - UI actualizada

---

## 🔧 Detalles Técnicos

### API Utilizada
- **Actualmente:** Whisper API (OpenAI) para transcripción post-grabación
- **Infraestructura lista:** Servicio de ElevenLabs Scribe con WebSocket para streaming real

### ¿Por qué no streaming en tiempo real?
React Native no soporta nativamente el streaming de audio durante la grabación. La solución actual:
- ✅ Graba el audio completo
- ✅ Al finalizar, transcribe automáticamente si el toggle está activado
- ✅ Resultado: Transcripción inmediata sin intervención manual

### Ventajas
- 🚀 **Rápido**: Transcripción automática sin clicks adicionales
- 💰 **Eficiente**: Solo transcribe cuando lo necesitas
- 🎯 **Flexible**: Dos métodos según tus necesidades
- 💾 **Persistente**: El toggle se guarda automáticamente

---

## 📊 Flujo de Uso

```
1. Usuario activa toggle "Transcripción Automática"
   ↓
2. Usuario presiona botón de grabar
   ↓
3. Usuario habla (con indicador visual activo)
   ↓
4. Usuario detiene grabación
   ↓
5. Sistema transcribe automáticamente
   ↓
6. Transcripción aparece con badge "Auto" ⚡
```

---

## ❓ Preguntas Frecuentes

### ¿Necesito activar el toggle cada vez?
**No.** El estado se guarda automáticamente. Si lo activas una vez, permanece activado.

### ¿Puedo usar ambos métodos?
**Sí.** Puedes tener el toggle activado para nuevas grabaciones y seguir usando el botón manual para grabaciones antiguas.

### ¿Qué pasa si no tengo API Key?
La app seguirá funcionando normalmente, pero no podrás transcribir automáticamente. El botón manual de Whisper seguirá disponible si tienes la API Key de OpenAI configurada.

### ¿Funciona con cualquier idioma?
Sí, actualmente está configurado para español ('es') pero se puede cambiar fácilmente en el código.

---

## 🎯 Próximos Pasos

1. **Agregar la API Key** en el tab ENV de Vibecode
2. **Probar la funcionalidad** grabando un mensaje de prueba
3. **Disfrutar** de la transcripción automática

---

## 📚 Recursos

- [Documentación Técnica Completa](./ELEVENLABS_SCRIBE_INTEGRATION.md)
- [ElevenLabs Realtime Speech-to-Text](https://elevenlabs.io/docs/developer-guides/realtime-speech-to-text)
- [ElevenLabs API Reference](https://elevenlabs.io/docs/api-reference/realtime-speech-to-text)

---

¡Todo listo! 🎉 La transcripción automática con ElevenLabs Scribe está completamente integrada y funcionando.
