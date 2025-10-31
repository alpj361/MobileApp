# Storage Migration Example - savedStore.ts

## 🎯 Objetivo
Migrar `savedStore.ts` de usar MMKV directamente a usar `PlatformStorage` para soporte web.

---

## 📋 Paso a Paso

### Paso 1: Identificar Uso Actual de MMKV

Busca en `src/state/savedStore.ts` patrones como:

```typescript
// ❌ Código actual (solo móvil)
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

// Operaciones
storage.set('key', 'value');
const value = storage.getString('key');
storage.set('items', JSON.stringify(items));
const items = JSON.parse(storage.getString('items') || '[]');
```

### Paso 2: Importar PlatformStorage

```typescript
// ✅ Nuevo código (móvil + web)
import { storage } from '@/storage/platform-storage';

// Ya no necesitas crear instancia, usa singleton global
// storage ya está listo para usar
```

### Paso 3: Reemplazar Operaciones

#### Strings
```typescript
// Antes
storage.set('lastSync', timestamp);
const lastSync = storage.getString('lastSync');

// Después
storage.setString('lastSync', timestamp);
const lastSync = storage.getString('lastSync');
```

#### Números
```typescript
// Antes
storage.set('count', 42);
const count = storage.getNumber('count');

// Después  
storage.setNumber('count', 42);
const count = storage.getNumber('count');
```

#### Booleans
```typescript
// Antes
storage.set('isDarkMode', true);
const isDarkMode = storage.getBoolean('isDarkMode');

// Después
storage.setBoolean('isDarkMode', true);
const isDarkMode = storage.getBoolean('isDarkMode');
```

#### Objects/Arrays (Más Común en Stores)
```typescript
// Antes
const items = [{ id: 1, name: 'Item' }];
storage.set('items', JSON.stringify(items));
const stored = JSON.parse(storage.getString('items') || '[]');

// Después (¡Mucho más simple!)
const items = [{ id: 1, name: 'Item' }];
storage.setObject('items', items);
const stored = storage.getObject('items') || [];
```

#### Eliminar
```typescript
// Antes
storage.delete('key');

// Después
storage.delete('key');  // Mismo método
```

---

## 🔧 Ejemplo Completo: Migración de savedStore

### ANTES (solo MMKV)

```typescript
import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const mmkv = new MMKV();
const STORAGE_KEY = 'saved_items';

interface SavedItem {
  id: string;
  content: string;
  timestamp: number;
}

interface SavedStore {
  items: SavedItem[];
  addItem: (item: SavedItem) => void;
  removeItem: (id: string) => void;
  loadItems: () => void;
  saveItems: () => void;
}

export const useSavedStore = create<SavedStore>((set, get) => ({
  items: [],
  
  loadItems: () => {
    try {
      const stored = mmkv.getString(STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored);
        set({ items });
      }
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  },
  
  saveItems: () => {
    try {
      const { items } = get();
      mmkv.set(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save items:', error);
    }
  },
  
  addItem: (item) => {
    set((state) => {
      const items = [...state.items, item];
      // Save immediately
      mmkv.set(STORAGE_KEY, JSON.stringify(items));
      return { items };
    });
  },
  
  removeItem: (id) => {
    set((state) => {
      const items = state.items.filter(i => i.id !== id);
      // Save immediately
      mmkv.set(STORAGE_KEY, JSON.stringify(items));
      return { items };
    });
  },
}));
```

### DESPUÉS (PlatformStorage - móvil + web)

```typescript
import { create } from 'zustand';
import { storage } from '@/storage/platform-storage';

const STORAGE_KEY = 'saved_items';

interface SavedItem {
  id: string;
  content: string;
  timestamp: number;
}

interface SavedStore {
  items: SavedItem[];
  addItem: (item: SavedItem) => void;
  removeItem: (id: string) => void;
  loadItems: () => void;
  saveItems: () => void;
}

export const useSavedStore = create<SavedStore>((set, get) => ({
  items: [],
  
  loadItems: () => {
    try {
      const items = storage.getArray<SavedItem>(STORAGE_KEY) || [];
      set({ items });
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  },
  
  saveItems: () => {
    try {
      const { items } = get();
      storage.setArray(STORAGE_KEY, items);
    } catch (error) {
      console.error('Failed to save items:', error);
    }
  },
  
  addItem: (item) => {
    set((state) => {
      const items = [...state.items, item];
      // Save immediately
      storage.setArray(STORAGE_KEY, items);
      return { items };
    });
  },
  
  removeItem: (id) => {
    set((state) => {
      const items = state.items.filter(i => i.id !== id);
      // Save immediately
      storage.setArray(STORAGE_KEY, items);
      return { items };
    });
  },
}));
```

### Cambios Principales

1. **Import cambió:**
   ```typescript
   // Antes
   import { MMKV } from 'react-native-mmkv';
   const mmkv = new MMKV();
   
   // Después
   import { storage } from '@/storage/platform-storage';
   // No instancias nada, es singleton
   ```

2. **Métodos más específicos:**
   ```typescript
   // Antes: set/get genéricos + JSON.parse/stringify manual
   mmkv.set(key, JSON.stringify(value));
   JSON.parse(mmkv.getString(key) || '[]');
   
   // Después: métodos tipados, JSON automático
   storage.setArray(key, value);
   storage.getArray(key) || [];
   ```

3. **Más simple y seguro:**
   - No necesitas manejar JSON.parse/stringify
   - Tipos TypeScript correctos
   - Funciona igual en móvil y web

---

## 🧪 Testing Post-Migración

### Test 1: Móvil Nativo
```bash
npm run ios
# O
npm run android
```

**Verificar:**
- [ ] Guarda items
- [ ] Carga items al reabrir
- [ ] No hay crashes
- [ ] Console sin errores

### Test 2: Web
```bash
npm run web
```

**Verificar:**
- [ ] Guarda items (check localStorage en DevTools)
- [ ] Carga items al refresh
- [ ] No hay crashes
- [ ] Console sin errores

### Test 3: Sincronización
```bash
# Terminal 1
npm run web

# Terminal 2  
npm run ios
```

**Verificar:**
- [ ] Agregar item en web → aparece en Supabase
- [ ] Agregar item en móvil → aparece en Supabase
- [ ] Ambos ven los cambios (via Supabase sync)
- [ ] Storage local funciona independiente

---

## 🔍 Debugging

### Ver datos almacenados en Web
```javascript
// Chrome DevTools Console
// Ver localStorage
Object.keys(localStorage)
  .filter(k => k.startsWith('vizta_'))
  .forEach(k => console.log(k, localStorage.getItem(k)));
```

### Ver datos almacenados en Móvil
```typescript
// Agregar temporalmente en tu componente
import { storage, StorageUtils } from '@/storage/platform-storage';

console.log('Storage Info:', StorageUtils.getInfo());
console.log('All Data:', StorageUtils.exportAll());
```

### Migrar datos existentes
Si users ya tienen datos en MMKV:

```typescript
import { Platform } from 'react-native';
import { storage } from '@/storage/platform-storage';

// Correr una sola vez al inicio
const migrateOldData = async () => {
  if (Platform.OS === 'web') return; // Solo en móvil
  
  try {
    const { MMKV } = require('react-native-mmkv');
    const oldStorage = new MMKV();
    
    // Migrar cada key que necesites
    const oldItems = oldStorage.getString('saved_items');
    if (oldItems && !storage.contains('saved_items')) {
      storage.setString('saved_items', oldItems);
      console.log('✓ Migrated saved_items');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

// Llamar al inicio de App.tsx (una vez)
// migrateOldData();
```

---

## ⚠️ Common Pitfalls

### 1. Olvidar cambiar import
```typescript
// ❌ Mal
import { MMKV } from 'react-native-mmkv';

// ✅ Bien  
import { storage } from '@/storage/platform-storage';
```

### 2. Usar set/get genéricos
```typescript
// ❌ Mal (no existen en PlatformStorage)
storage.set('key', value);
storage.get('key');

// ✅ Bien (métodos específicos)
storage.setString('key', value);
storage.getString('key');
```

### 3. Olvidar que getObject puede retornar undefined
```typescript
// ❌ Mal (puede crashear si no existe)
const items = storage.getArray<Item>('items');
items.forEach(...);

// ✅ Bien (maneja undefined)
const items = storage.getArray<Item>('items') || [];
items.forEach(...);
```

### 4. No verificar plataforma para migration
```typescript
// ❌ Mal (intenta importar MMKV en web = crash)
const { MMKV } = require('react-native-mmkv');

// ✅ Bien (solo en móvil)
if (Platform.OS !== 'web') {
  const { MMKV } = require('react-native-mmkv');
}
```

---

## 📋 Checklist de Migración

Para cada store que migres:

- [ ] Cambiar import de MMKV a PlatformStorage
- [ ] Reemplazar `mmkv.set()` con `storage.setString/Number/etc()`
- [ ] Reemplazar `mmkv.getString()` con `storage.getString()`
- [ ] Eliminar JSON.parse/stringify manual (usar setObject/getObject)
- [ ] Verificar manejo de undefined/null
- [ ] Test en iOS
- [ ] Test en Android  
- [ ] Test en Web
- [ ] Verificar datos persisten al cerrar/reabrir
- [ ] Check console por errores
- [ ] (Opcional) Migrar datos existentes de usuarios

---

## 🎯 Próximos Stores a Migrar

Después de `savedStore.ts`, migra en este orden:

1. **`chatStore.ts`** - Similar pattern
2. **`settingsStore.ts`** - Settings simples
3. **Otros stores** - Si tienen persistencia

Cada uno debería tomar ~30-60 minutos.

---

## 💡 Pro Tips

1. **Migra de uno en uno** - No todos al mismo tiempo
2. **Test exhaustivamente** - Cada store después de migrar
3. **Keep backups** - Git commit antes de cada migración
4. **Use StorageUtils** - Para debugging y export/import
5. **Consider migration script** - Para usuarios existentes con datos
6. **Document breaking changes** - Si cambias keys

---

## 📞 Si Algo Sale Mal

### Rollback rápido:
```bash
git checkout src/state/savedStore.ts
```

### Check logs:
```typescript
// En PlatformStorage, todos los errores se loggean
// Check console para ver qué falló
console.error('[WebStorage] ...', error);
console.error('[MMKVStorage] ...', error);
```

### Test manual:
```typescript
// En cualquier componente
import { storage } from '@/storage/platform-storage';

// Test básico
storage.setString('test', 'hello');
console.log('Test:', storage.getString('test')); // Debe mostrar "hello"
storage.delete('test');
```

---

**¿Listo para migrar el primer store?** 

Start with `savedStore.ts` siguiendo este ejemplo! 🚀

