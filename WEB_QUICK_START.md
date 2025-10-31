# Guía Rápida: Web Development

## 🚀 Comandos Esenciales

```bash
# Desarrollo
npm run web                    # Iniciar dev server web
npm run start                  # Dev server (seleccionar plataforma)

# Build
npm run web:build              # Build para producción web
npm run web:serve              # Servir build localmente

# Testing
npm run ios                    # Test iOS
npm run android                # Test Android
```

## 🔍 Testing Multi-Plataforma

```bash
# Terminal 1: Web
npm run web

# Terminal 2: iOS (simultáneo)
npm run ios

# Verificar sincronización Supabase entre ambos
```

## 📱 Platform Detection Pattern

```typescript
import { Platform } from 'react-native';
import { isWeb, isMobileApp } from '@/hooks/usePlatform';

// Opción 1: Inline
if (Platform.OS === 'web') {
  // Código específico web
} else {
  // Código móvil nativo
}

// Opción 2: Hooks
const isWebPlatform = isWeb();

// Opción 3: Componentes condicionales
return Platform.select({
  web: <WebComponent />,
  default: <NativeComponent />
});
```

## 🗄️ Storage Pattern (Cuando esté implementado)

```typescript
import { storage } from '@/storage/platform-storage';

// API unificada para web y móvil
storage.setString('key', 'value');
const value = storage.getString('key');

// Automáticamente usa:
// - MMKV en iOS/Android
// - localStorage en web
```

## 🎨 Styling con NativeWind

```tsx
// ✅ Funciona en todas las plataformas
<View className="flex-1 bg-white p-4">
  <Text className="text-lg font-bold">
    Hello World
  </Text>
</View>

// ✅ Conditional classes
<View className={`p-4 ${isWeb() ? 'max-w-lg' : 'w-full'}`}>
```

## 🔌 Supabase Client

```typescript
// Automáticamente usa el cliente correcto
import { supabase } from '@/config/supabase';

// En móvil: @supabase/supabase-js
// En web: fetch-based client

const { data, error } = await supabase
  .from('table')
  .select('*');
```

## ⚠️ Features NO Soportadas en Web (Degradar)

```typescript
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Degradar gracefully
const hapticFeedback = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

// Cámara - mostrar mensaje
if (Platform.OS === 'web') {
  return <Text>Feature disponible solo en app móvil</Text>;
}
return <Camera />;
```

## 🐛 Debug Tips

### Check Platform
```typescript
console.log('Platform:', Platform.OS);
console.log('Dimensions:', Dimensions.get('window'));
```

### Network Requests
```typescript
// Agregar header de plataforma
import { getPlatformHeader } from '@/hooks/usePlatform';

fetch(url, {
  headers: {
    'X-Platform': getPlatformHeader(),
  }
});
```

### Storage Issues
```typescript
// Verificar storage funciona
import { storage } from '@/storage/platform-storage';

storage.setString('test', 'hello');
console.log('Test:', storage.getString('test')); // Should log "hello"
```

## 📦 Build & Deploy

```bash
# 1. Build web
npm run web:build

# 2. Output en: web-build/

# 3. Servir localmente para testing
npm run web:serve

# 4. Deploy con Docker
docker-compose -f docker-compose.web.yml up --build
```

## 🔧 Troubleshooting

### Error: Module not found
- Verificar que el paquete sea compatible con web
- Usar abstracción de plataforma si es nativo-only

### Gestos no funcionan
- `react-native-gesture-handler` funciona en web
- Verificar que el componente esté envuelto en `GestureHandlerRootView`

### Animaciones laggy
- Usar `useNativeDriver: false` en web
- Simplificar animaciones complejas
- Considerar CSS transitions como alternativa

### Modal no aparece
- Verificar Portal/Overlay setup
- Usar `Modal` de react-native (funciona en web)
- Verificar z-index en CSS

## 📚 Architecture Patterns

### Component Adaptation
```typescript
// Pattern 1: Single component with platform checks
export function MyComponent() {
  if (Platform.OS === 'web') {
    return <WebVersion />;
  }
  return <NativeVersion />;
}

// Pattern 2: Separate files
// MyComponent.tsx (shared logic)
// MyComponent.web.tsx (web specific)
// MyComponent.native.tsx (mobile specific)
// Metro automáticamente carga el correcto
```

### Service Layer
```typescript
// Servicios NO necesitan cambios
// Solo agregar platform header si es relevante
export const fetchData = async () => {
  const response = await fetch(API_URL, {
    headers: {
      'X-Platform': getPlatformHeader(), // mobile-app | mobile-web
    }
  });
  return response.json();
};
```

## 🎯 Testing Checklist por Feature

Cuando implementes un feature, verifica:

- [ ] Funciona en iOS
- [ ] Funciona en Android  
- [ ] Funciona en Web (Chrome mobile view)
- [ ] Funciona en Desktop web (>768px)
- [ ] Datos se sincronizan entre plataformas
- [ ] No hay crashes/errors en consola
- [ ] Performance aceptable en web
- [ ] UI se ve bien en todos los tamaños

## 🚨 Common Pitfalls

1. **MMKV en web** - No funciona, usar abstracción
2. **Bottom Sheet** - No funciona, usar Modal o alternativa
3. **Haptics** - No funciona, degradar a no-op
4. **Context Menus nativos** - No funcionan, usar menus web
5. **Vision Camera** - No funciona, deshabilitar o usar Media API
6. **AsyncStorage antiguo** - Ya no usar, migrar a MMKV o abstracción

## 🔗 URLs Útiles

- Dev Server Web: http://localhost:19006
- Metro Bundler: http://localhost:8081
- Expo DevTools: http://localhost:19002

## 💡 Pro Tips

1. **Desarrolla primero en móvil nativo**, luego adapta a web
2. **Usa Platform.select()** para código condicional limpio
3. **Testea en Chrome DevTools móvil** antes de dispositivo real
4. **Mantén componentes pequeños** y enfocados
5. **Extrae lógica de UI** para reutilizar entre plataformas
6. **No duplices código**, usa condicionales cuando sea necesario
7. **WebContainer maneja el responsive**, no necesitas hacerlo en cada componente

