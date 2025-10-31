# Plan de Implementación: Mobile Web App Coexistente con Mobile Native

**Fecha:** 31 de Octubre, 2025  
**Proyecto:** Vizta Mobile App  
**Objetivo:** Convertir la aplicación móvil nativa en una versión web que coexista y esté sincronizada con la app nativa

---

## 📊 Estado Actual del Proyecto

### ✅ Ya Implementado

1. **Configuración Expo Web**
   - ✅ `react-native-web` instalado (v0.20.0)
   - ✅ `react-dom` instalado (v19.0.0)
   - ✅ Scripts de web en `package.json`: `web`, `web:build`, `web:serve`
   - ✅ Configuración web en `app.json` (bundler: metro, output: single)
   - ✅ `app.html` personalizado con meta tags para PWA

2. **Adaptación de Plataforma**
   - ✅ `WebContainer` componente ya existe
   - ✅ `usePlatform` hook implementado
   - ✅ `isWeb()` y `isMobileApp()` helpers disponibles
   - ✅ `getPlatformHeader()` para identificación backend

3. **Configuración de Supabase Multi-plataforma**
   - ✅ `supabase.native.ts` para móvil nativo
   - ✅ `supabase.web.ts` con cliente fetch personalizado
   - ✅ `supabase.ts` como punto de entrada unificado

4. **Estilos**
   - ✅ NativeWind v4 configurado (Tailwind CSS para React Native)
   - ✅ `global.css` importado en `index.ts`
   - ✅ Babel configurado con NativeWind

---

## 🎯 Objetivos del Plan

1. **Coexistencia:** Mobile app y web app funcionando simultáneamente
2. **Sincronización:** Datos compartidos vía Supabase
3. **Código Compartido:** Reutilizar componentes existentes SIN crear versiones web separadas
4. **Experiencia Uniforme:** UI/UX consistente entre plataformas con adaptaciones mínimas

---

## 📋 Análisis de Componentes y Compatibilidad

### Componentes Core (src/components/)

| Componente | Estado Web | Requiere Adaptación | Notas |
|------------|-----------|---------------------|-------|
| `WebContainer.tsx` | ✅ Listo | No | Ya implementado |
| `SavedItemCard.tsx` | ⚠️ Revisar | Posible | Verificar gestos y animaciones |
| `MobileTweetCard.tsx` | ⚠️ Revisar | Sí | Verificar componentes nativos |
| `MobileTweetsSection.tsx` | ⚠️ Revisar | Sí | Verificar listas |
| `NewsCard.tsx` | ⚠️ Revisar | Posible | Verificar componentes |
| `StoriesCarousel.tsx` | ❌ Crítico | Sí | Carrusel/gestos necesitan adaptación |
| `LinkPreview.tsx` | ⚠️ Revisar | Posible | Verificar navegación |
| `CustomHeader.tsx` | ⚠️ Revisar | Posible | Verificar navegación drawer |
| `*Modal.tsx` (4 modales) | ❌ Crítico | Sí | Modales nativos no compatibles |

### Navegación

| Elemento | Paquete | Compatible Web | Alternativa |
|----------|---------|---------------|-------------|
| Drawer Navigator | `@react-navigation/drawer` | ⚠️ Limitado | Hamburger menu responsive |
| Stack Navigator | `@react-navigation/native-stack` | ✅ Sí | Puede usar web stack |
| Bottom Tabs | `@react-navigation/bottom-tabs` | ✅ Sí | Compatible |

### Dependencias Críticas que NO funcionan en Web

| Paquete | Uso en App | Solución |
|---------|-----------|----------|
| `react-native-mmkv` | Storage local | ⚠️ Usar `localStorage` / `IndexedDB` web |
| `@gorhom/bottom-sheet` | Modales | ❌ Usar alternativa web (CSS + Portal) |
| `expo-haptics` | Feedback táctil | ✅ Degradar gracefully (no-op en web) |
| `expo-camera` | Cámara | ⚠️ Usar Media API web |
| `react-native-vision-camera` | Cámara avanzada | ❌ No soportado, degradar |
| `@shopify/react-native-skia` | Gráficos | ❌ No soportado, usar SVG/Canvas |
| `react-native-ios-context-menu` | Menús iOS | ❌ Degradar a menú web estándar |
| `zeego` | Menús nativos | ❌ Degradar a menú web |
| `@react-native-menu/menu` | Menús | ❌ Degradar a dropdown web |
| `lottie-react-native` | Animaciones | ⚠️ Usar `lottie-web` |

---

## 🛠️ Estrategia de Implementación

### Fase 1: Configuración Base (COMPLETADA ✅)

- [x] Expo Web instalado
- [x] Configuración de bundler (Metro)
- [x] HTML base con meta tags PWA
- [x] WebContainer para layout responsive
- [x] Platform detection hooks
- [x] Supabase multi-plataforma

### Fase 2: Adaptación de Almacenamiento 🔄

**Problema:** MMKV no funciona en web

**Solución:** Crear abstracción de storage

```typescript
// src/storage/platform-storage.ts
import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

// Interfaz unificada
export interface PlatformStorage {
  getString(key: string): string | undefined;
  setString(key: string, value: string): void;
  getBoolean(key: string): boolean | undefined;
  setBoolean(key: string, value: boolean): void;
  delete(key: string): void;
  clearAll(): void;
}

// Implementación MMKV (nativo)
class MMKVStorage implements PlatformStorage {
  private storage = new MMKV();
  // ... implementación
}

// Implementación Web (localStorage)
class WebStorage implements PlatformStorage {
  getString(key: string) {
    return localStorage.getItem(key) || undefined;
  }
  setString(key: string, value: string) {
    localStorage.setItem(key, value);
  }
  // ... resto implementación
}

// Export según plataforma
export const storage: PlatformStorage = 
  Platform.OS === 'web' ? new WebStorage() : new MMKVStorage();
```

**Archivos a modificar:**
- `src/state/savedStore.ts` - Usa MMKV directamente
- `src/state/chatStore.ts`
- `src/state/settingsStore.ts`
- Todos los stores de Zustand con persistencia

### Fase 3: Adaptación de Modales 🔄

**Problema:** `@gorhom/bottom-sheet` no funciona en web

**Solución:** Crear componente modal adaptativo

```typescript
// src/components/AdaptiveModal.tsx
import { Platform, Modal } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';

export function AdaptiveModal({ children, isVisible, onClose, ...props }) {
  if (Platform.OS === 'web') {
    return (
      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <div className="modal-overlay">
          <div className="modal-content">
            {children}
          </div>
        </div>
      </Modal>
    );
  }
  
  return (
    <BottomSheet {...props}>
      {children}
    </BottomSheet>
  );
}
```

**Componentes a adaptar:**
- `InstagramCommentsModal.tsx`
- `XCommentsModal.tsx`
- `SocialAnalysisModal.tsx`
- Cualquier uso de BottomSheet

### Fase 4: Adaptación de Navegación 🔄

**Drawer Navigator en Web**

El drawer funciona en web pero con limitaciones visuales. Opciones:

1. **Opción A (Recomendada):** Mantener Drawer adaptado
   - Desktop: Sidebar fijo o colapsable
   - Mobile Web: Hamburger menu igual que nativo

2. **Opción B:** Header con tabs en web
   - Desktop: Navigation bar horizontal
   - Mobile Web: Bottom tabs

**Implementación Opción A:**

```typescript
// Actualizar src/navigation/TabNavigator.tsx
import { Platform, useWindowDimensions } from 'react-native';

export default function DrawerNavigator() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: isDesktop ? 240 : 280,
        },
        drawerType: isDesktop ? 'permanent' : 'slide',
      }}
    >
      {/* screens */}
    </Drawer.Navigator>
  );
}
```

### Fase 5: Adaptación de Componentes Críticos 🔄

#### StoriesCarousel

**Problema:** Usa gestos nativos que pueden no funcionar bien en web

**Solución:** Verificar si `react-native-pager-view` funciona en web, si no:

```typescript
// src/components/StoriesCarousel.tsx
if (Platform.OS === 'web') {
  // Usar carrusel basado en scroll CSS
  return <WebStoriesCarousel {...props} />;
}
return <NativeStoriesCarousel {...props} />;
```

#### SavedItemCard y TweetCard

**Revisar:**
- Animaciones con Reanimated (soportado en web)
- Gestos con gesture-handler (soportado en web)
- Context menus nativos → degradar a menús web estándar

### Fase 6: Features Específicas de Plataforma 🔄

**Cámara/Grabación:**
- RecordingScreen: Adaptar para usar Media API web
- Vision Camera: Degradar o deshabilitar en web

**Haptics:**
```typescript
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const triggerHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
  // En web: silent no-op
};
```

**Menús Contextuales:**
```typescript
// Degradar zeego, react-native-ios-context-menu
if (Platform.OS === 'web') {
  return <WebContextMenu />;
}
return <NativeContextMenu />;
```

### Fase 7: PWA (Progressive Web App) 🔄

**Configurar app.json para PWA:**

```json
{
  "expo": {
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/favicon.png",
      "build": {
        "babel": {
          "include": ["@gorhom/bottom-sheet"]
        }
      }
    }
  }
}
```

**Crear manifest.json:**

```json
{
  "short_name": "Vizta",
  "name": "Vizta - Social Media Assistant",
  "icons": [
    {
      "src": "/icon-192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "/icon-512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "orientation": "portrait"
}
```

**Service Worker para offline:**

```javascript
// public/service-worker.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('vizta-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/static/js/bundle.js',
        '/static/css/main.css',
      ]);
    })
  );
});
```

### Fase 8: Sincronización de Datos ✅

**Ya implementado vía Supabase:**
- Real-time subscriptions funcionan igual en web
- Auth funciona con supabase.auth.getSession()
- Storage queries idénticas

**Verificar:**
- [ ] Real-time listeners activos en ambas plataformas
- [ ] Auth state sincronizado
- [ ] Polling/refetch strategies consistentes

---

## 📦 Dependencias Adicionales Necesarias

```json
{
  "dependencies": {
    // PWA
    "workbox-webpack-plugin": "^7.0.0",
    "workbox-window": "^7.0.0",
    
    // Alternativas web
    "lottie-web": "^5.12.2", // Si usan Lottie
    
    // Ya tienen react-native-web y react-dom ✅
  }
}
```

---

## 🔧 Configuración Docker

**Actualizar docker-compose para servir web:**

```yaml
# docker-compose.web.yml
version: '3.8'

services:
  vizta-web:
    build:
      context: .
      dockerfile: Dockerfile.web
    ports:
      - "19006:19006"
    environment:
      - NODE_ENV=production
      - EXPO_PUBLIC_EXTRACTORW_URL=${EXPO_PUBLIC_EXTRACTORW_URL}
    volumes:
      - ./web-build:/app/web-build
    command: npx serve web-build -l 19006
```

**Dockerfile.web:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production=false

COPY . .

RUN npm run web:build

EXPOSE 19006

CMD ["npx", "serve", "web-build", "-l", "19006"]
```

---

## 🎨 Consideraciones de UI/UX

### Desktop (>768px)
- Contenedor centrado max-width: 428px (ya implementado en WebContainer)
- Sidebar drawer permanente (opcional)
- Sombra alrededor del contenedor para simular móvil

### Mobile Web (<768px)
- Full width
- Touch gestures nativos del navegador
- Pull-to-refresh del navegador (considerar deshabilitar)

### Gestos y Animaciones
- React Native Reanimated funciona en web ✅
- Gesture Handler funciona en web ✅
- Verificar performance de animaciones complejas

---

## 📝 Checklist de Implementación

### Configuración Base
- [x] Expo Web configurado
- [x] app.html con meta tags
- [x] WebContainer implementado
- [x] Platform detection hooks

### Storage
- [ ] Crear abstracción `PlatformStorage`
- [ ] Migrar `savedStore` a usar abstracción
- [ ] Migrar `chatStore` a usar abstracción
- [ ] Migrar `settingsStore` a usar abstracción
- [ ] Migrar otros stores con persistencia

### Modales
- [ ] Crear `AdaptiveModal` component
- [ ] Refactorizar `InstagramCommentsModal`
- [ ] Refactorizar `XCommentsModal`
- [ ] Refactorizar `SocialAnalysisModal`
- [ ] Estilos CSS para modales web

### Navegación
- [ ] Adaptar DrawerNavigator para web
- [ ] Verificar transiciones de navegación
- [ ] Ajustar header para desktop/mobile web

### Componentes UI
- [ ] Auditar `SavedItemCard` para web
- [ ] Auditar `MobileTweetCard` para web
- [ ] Adaptar `StoriesCarousel` para web
- [ ] Reemplazar context menus nativos
- [ ] Verificar todos los componentes con gestos

### Features Específicas
- [ ] Adaptar RecordingScreen para web (Media API)
- [ ] Degradar haptics en web (no-op)
- [ ] Adaptar cámara features (o deshabilitar)
- [ ] Verificar expo-av (audio/video) en web

### Servicios Backend
- [ ] Verificar headers de plataforma en requests
- [ ] Confirmar endpoints funcionan con ambas plataformas
- [ ] Testing de ExtractorW desde web

### PWA
- [ ] Generar iconos PWA (192x192, 512x512)
- [ ] Crear manifest.json
- [ ] Implementar service worker básico
- [ ] Configurar caching strategy
- [ ] Testing install prompt

### Testing
- [ ] Test todas las pantallas en Chrome mobile view
- [ ] Test en Safari iOS (mobile web)
- [ ] Test en desktop (Chrome, Firefox, Safari)
- [ ] Test sincronización datos entre apps
- [ ] Test offline mode (PWA)

### Deployment
- [ ] Configurar Dockerfile.web
- [ ] Actualizar docker-compose
- [ ] Configurar CI/CD para builds web
- [ ] Deploy a VPS
- [ ] Configurar dominio/SSL

---

## 🚀 Orden de Ejecución Recomendado

### Sprint 1: Foundation (Semana 1)
1. ✅ Configuración base (YA COMPLETADO)
2. Abstracción de storage
3. Migrar stores principales

### Sprint 2: UI Adaptation (Semana 2)
4. Componente AdaptiveModal
5. Refactorizar modales existentes
6. Adaptar navegación para desktop

### Sprint 3: Components (Semana 3)
7. Auditar y adaptar cards/componentes
8. Degradar features nativas
9. Implementar alternativas web

### Sprint 4: PWA & Polish (Semana 4)
10. Configuración PWA completa
11. Testing exhaustivo multiplataforma
12. Deployment y monitoreo

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Performance degradado en web | Alto | Lazy loading, code splitting, optimizar re-renders |
| Animaciones laggy | Medio | Simplificar animaciones en web, usar CSS transitions |
| Gestos no funcionan igual | Medio | Usar alternativas CSS, verificar gesture-handler web |
| MMKV migration | Alto | Testing exhaustivo de migration logic |
| Inconsistencia UI | Medio | Design system unificado, testing visual |
| SEO limitado (SPA) | Bajo | No es prioridad para app-like experience |

---

## 📊 Métricas de Éxito

- [ ] Web app carga en <3s (3G)
- [ ] Todos los componentes core funcionan en web
- [ ] Datos sincronizados en tiempo real entre plataformas
- [ ] PWA instalable en móviles
- [ ] 0 crashes críticos en producción primera semana
- [ ] Performance score >80 en Lighthouse

---

## 🔗 Referencias

- [Expo Web Docs](https://docs.expo.dev/workflow/web/)
- [React Native Web](https://necolas.github.io/react-native-web/)
- [NativeWind Web Support](https://www.nativewind.dev/v4/overview)
- [React Navigation Web](https://reactnavigation.org/docs/web-support/)

---

## 📞 Decisiones Pendientes

1. **Navegación Desktop:** ¿Drawer permanente o tabs horizontales?
2. **RecordingScreen:** ¿Implementar o deshabilitar en web?
3. **Cámara Features:** ¿Implementar fallback o marcar como "mobile only"?
4. **Service Worker:** ¿Caching agresivo o minimal?
5. **Domain/Hosting:** ¿Subdomain (app.vizta.com) o path (/app)?

---

**Resumen:** La mayoría de la configuración base está completa. El trabajo principal es:
1. Abstracción de storage (MMKV → localStorage)
2. Adaptación de modales (BottomSheet → Modal web)
3. Testing y pulido de componentes existentes
4. PWA configuration

Estimación: **3-4 semanas** para MVP web completo con feature parity.

