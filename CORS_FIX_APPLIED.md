# CORS Fix Aplicado - Resumen

## 🎯 Problema Detectado

```
❌ Access to fetch at 'https://server.standatpd.com/api/x/media' 
   from origin 'http://localhost:8082' 
   has been blocked by CORS policy
```

**Causa:** ExtractorW no permitía requests desde `localhost:8082` (Expo web)

---

## ✅ Cambios Aplicados

### 1. **ExtractorW - CORS Updated** ✅
**Archivo:** `/Users/pj/Desktop/Pulse Journal/ExtractorW/server/index.js`

**Agregado a allowedOrigins:**
```javascript
'http://localhost:8081',  // Expo Metro Bundler
'http://localhost:8082',  // Expo Web Dev Server
'http://localhost:19006', // Expo Web alternativo
```

**Resultado:** ExtractorW ahora acepta requests desde web app

---

### 2. **Frontend - URLs Locales en Web** ✅
**Archivo:** `src/config/backend.ts`

**Antes:**
```typescript
// Web y móvil usaban mismas URLs remotas
EXTRACTORW_URL: 'https://server.standatpd.com'
EXTRACTORT_URL: 'https://api.standatpd.com'
```

**Ahora:**
```typescript
// Web: Docker local (puerto 3010)
Web → EXTRACTORW_URL: 'http://localhost:3010'
Web → EXTRACTORT_URL: 'http://localhost:3010'

// Mobile: Servidor remoto (producción)
iOS/Android → EXTRACTORW_URL: 'https://server.standatpd.com'
iOS/Android → EXTRACTORT_URL: 'https://api.standatpd.com'
```

**Resultado:** 
- Web conecta a Docker local (sin CORS)
- Mobile conecta a servidor remoto (como antes)

---

## 🚀 Para que Funcione

### 1. Reiniciar ExtractorW Docker
```bash
cd "/Users/pj/Desktop/Pulse Journal/ExtractorW"
docker-compose down
docker-compose up --build
```

**Debe mostrar:**
```
Servidor iniciado en puerto 3010
```

### 2. Verificar ExtractorW Funciona
```bash
curl http://localhost:3010/health
# Debería responder OK
```

### 3. Reiniciar Expo Web
```bash
cd /Users/pj/Desktop/04bc0317-b8c9-4395-93f8-baaf4706af5c
pkill -9 -f "expo|metro"
npx expo start --web --clear
```

---

## 🧪 Testing

### Logs Esperados en Console:

```
✅ [Backend Config] {
     extractorW: 'http://localhost:3010',    ← LOCAL
     extractorT: 'http://localhost:3010',    ← LOCAL
     platform: 'web'
   }

✅ [X Complete] 📤 Calling ExtractorT /enhanced-media/process
✅ [X Complete] ✅ Response received from ExtractorT
✅ [X Complete] Success: true
```

### Network Tab:

```
✅ POST http://localhost:3010/enhanced-media/process
   Status: 200 OK
   (No CORS error)
```

---

## 📊 Arquitectura Final

```
Web App (localhost:8082)
    │
    ├─→ ExtractorW (localhost:3010) ✅ CORS permitido
    │     │
    │     └─→ ExtractorT (interno)
    │
    └─→ Supabase (qqshdccpmypelhmyqnut.supabase.co) ✅

iOS App
    │
    ├─→ ExtractorW (server.standatpd.com) ✅
    │     │
    │     └─→ ExtractorT (api.standatpd.com)
    │
    └─→ Supabase (qqshdccpmypelhmyqnut.supabase.co) ✅
```

---

## ⚠️ Importante

### Para Desarrollo:
- **Web:** Requiere ExtractorW corriendo en Docker local (puerto 3010)
- **Mobile:** Puede usar servidor remoto (o local si prefieres)

### Para Producción:
Cambiar fallbacks en `backend.ts` a URLs de producción o usar variables de entorno:
```bash
EXPO_PUBLIC_EXTRACTORW_URL_LOCAL=https://tu-servidor.com
```

---

## ✅ Resultado Esperado

Después de reiniciar Docker y Expo:

### Web:
1. ✅ Pegar link de X
2. ✅ Badge "Analizando..." aparece
3. ✅ Request a `http://localhost:3010`
4. ✅ Sin error CORS
5. ✅ Datos se cargan (texto, imagen, métricas)
6. ✅ Badge desaparece

### iOS:
1. ✅ Sigue funcionando igual
2. ✅ Usa servidor remoto
3. ✅ No afectado por cambios

---

## 🔧 Comandos Completos

```bash
# Terminal 1: ExtractorW
cd "/Users/pj/Desktop/Pulse Journal/ExtractorW"
docker-compose down && docker-compose up

# Terminal 2: Expo Web  
cd /Users/pj/Desktop/04bc0317-b8c9-4395-93f8-baaf4706af5c
pkill -9 -f "expo" && npx expo start --web --clear

# Abrir: http://localhost:8082
```

---

**CORS fix aplicado! Reinicia Docker y prueba.** 🚀

