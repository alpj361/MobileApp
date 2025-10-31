# Arquitectura Web + Mobile App Coexistente

## 🏗️ Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    VIZTA APPLICATION                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐              ┌──────────────────┐     │
│  │   MOBILE APP    │              │   MOBILE WEB     │     │
│  │   (iOS/Android) │              │   (Browser)      │     │
│  └────────┬────────┘              └────────┬─────────┘     │
│           │                                │                │
│           └────────────┬───────────────────┘                │
│                        │                                    │
│              ┌─────────▼─────────┐                         │
│              │  SHARED CODEBASE  │                         │
│              │  (React Native)   │                         │
│              └─────────┬─────────┘                         │
│                        │                                    │
│         ┌──────────────┼──────────────┐                    │
│         │              │              │                    │
│    ┌────▼────┐   ┌────▼────┐   ┌────▼────┐              │
│    │UI Layer │   │Business │   │Data     │              │
│    │         │   │Logic    │   │Layer    │              │
│    └────┬────┘   └────┬────┘   └────┬────┘              │
│         │              │              │                    │
│         └──────────────┼──────────────┘                    │
│                        │                                    │
│              ┌─────────▼─────────┐                         │
│              │  PLATFORM ADAPTERS│                         │
│              │  (web vs native)  │                         │
│              └─────────┬─────────┘                         │
│                        │                                    │
│           ┌────────────┼───────────┐                       │
│           │            │           │                       │
│      ┌────▼───┐   ┌───▼────┐  ┌──▼────┐                  │
│      │Storage │   │UI Comp │  │APIs   │                  │
│      │Adapter │   │Adapter │  │Adapter│                  │
│      └────┬───┘   └───┬────┘  └──┬────┘                  │
│           │           │          │                         │
│    ┌──────▼──────┬────▼──────────▼───────┐               │
│    │   MMKV      │   BottomSheet  │ ...  │   NATIVE      │
│    └─────────────┴────────────────────────┘               │
│                                                             │
│    ┌──────────────┬─────────────────────┐                 │
│    │ localStorage │ Modal (RN) │ ...    │   WEB          │
│    └──────────────┴─────────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │   SUPABASE      │
              │   (Sync Layer)  │
              └─────────────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
         ┌────▼────┐        ┌────▼────┐
         │Database │        │ExtractorW│
         │(Postgres)│        │(Backend)│
         └─────────┘        └─────────┘
```

## 📱 Platform Detection Flow

```
User Loads App
    │
    ├─→ Platform.OS === 'web'?
    │   │
    │   YES ──→ WebStorage
    │   │       Modal (RN)
    │   │       CSS Animations
    │   │       Supabase (fetch)
    │   │       localStorage
    │   │       No Haptics
    │   │
    │   NO ───→ MMKVStorage
    │           BottomSheet
    │           Reanimated
    │           Supabase (SDK)
    │           MMKV
    │           Haptics
    │
    └─→ WebContainer
        │
        ├─→ Width >= 768px?
        │   │
        │   YES ──→ Centered (max-width: 428px)
        │   │       Desktop Layout
        │   │       Permanent Drawer (optional)
        │   │
        │   NO ───→ Full Width
        │           Mobile Layout
        │           Slide Drawer
```

## 🗂️ Data Sync Architecture

```
┌──────────────┐         ┌──────────────┐
│  Mobile App  │         │  Mobile Web  │
│  (Device 1)  │         │  (Browser)   │
└──────┬───────┘         └──────┬───────┘
       │                        │
       │  Save Item             │  Save Item
       │                        │
       ▼                        ▼
┌──────────────────────────────────────┐
│         SUPABASE (Real-time)         │
│  ┌────────────────────────────────┐  │
│  │  saved_items table             │  │
│  │  - id                          │  │
│  │  - user_id                     │  │
│  │  - content                     │  │
│  │  - platform (mobile/web)       │  │
│  │  - synced_at                   │  │
│  └────────────────────────────────┘  │
└──────┬───────────────────┬───────────┘
       │                   │
       │ Real-time Update  │ Real-time Update
       ▼                   ▼
┌──────────────┐     ┌──────────────┐
│  Device 1    │     │  Browser     │
│  ✓ Updated   │     │  ✓ Updated   │
└──────────────┘     └──────────────┘
```

## 🔧 Storage Abstraction Layer

```typescript
// Unified Interface
interface PlatformStorage {
  getString(key: string): string | undefined;
  setString(key: string, value: string): void;
  getObject<T>(key: string): T | undefined;
  setObject<T>(key: string, value: T): void;
  // ... more methods
}

// Platform Detection
┌─────────────────────────────────────────┐
│        storage (singleton)              │
├─────────────────────────────────────────┤
│                                         │
│  if (Platform.OS === 'web')            │
│     return new WebStorage()             │
│  else                                   │
│     return new MMKVStorage()            │
│                                         │
└─────────────────────────────────────────┘
           │
           ├─→ Web: localStorage API
           └─→ Native: MMKV native module
```

## 🎨 Component Adaptation Patterns

### Pattern 1: Platform Checks (Inline)
```typescript
export function MyComponent() {
  return (
    <View>
      {Platform.OS === 'web' ? (
        <WebSpecificFeature />
      ) : (
        <NativeSpecificFeature />
      )}
    </View>
  );
}
```

### Pattern 2: Platform Files (Metro Auto-resolution)
```
src/components/
  ├── MyComponent.tsx        (shared logic)
  ├── MyComponent.web.tsx    (web override)
  └── MyComponent.native.tsx (mobile override)

// Import: import MyComponent from './MyComponent'
// Metro automatically loads correct file
```

### Pattern 3: Adapter Components
```typescript
// AdaptiveModal.tsx
export function AdaptiveModal(props) {
  if (Platform.OS === 'web') {
    return <Modal {...props} />; // RN Modal
  }
  return <BottomSheet {...props} />; // Native BottomSheet
}
```

## 🔄 State Management (Zustand + Persistence)

```
┌─────────────────────────────────────────┐
│         Zustand Store (savedStore)      │
├─────────────────────────────────────────┤
│  State: savedItems[]                    │
│  Actions: addItem(), deleteItem()       │
└──────────┬──────────────────────────────┘
           │
           │ persist middleware
           ▼
┌─────────────────────────────────────────┐
│      PlatformStorage Adapter            │
├─────────────────────────────────────────┤
│  Platform.OS === 'web'                  │
│    ↓ localStorage                       │
│  Platform.OS !== 'web'                  │
│    ↓ MMKV                               │
└─────────────────────────────────────────┘
           │
           │ sync
           ▼
┌─────────────────────────────────────────┐
│         Supabase (Cloud)                │
│  Real-time sync across devices          │
└─────────────────────────────────────────┘
```

## 🚀 Build & Deploy Flow

```
┌─────────────────┐
│  Source Code    │
│  (TypeScript)   │
└────────┬────────┘
         │
         ├──────────────┬─────────────┐
         │              │             │
    ┌────▼────┐   ┌────▼────┐  ┌────▼────┐
    │iOS Build│   │Android  │  │Web Build│
    │         │   │Build    │  │         │
    └────┬────┘   └────┬────┘  └────┬────┘
         │              │             │
         │              │             │
    ┌────▼────┐   ┌────▼────┐  ┌────▼────┐
    │.ipa     │   │.apk/.aab│  │Static   │
    │(Native) │   │(Native) │  │HTML/JS  │
    └────┬────┘   └────┬────┘  └────┬────┘
         │              │             │
         │              │             ▼
         │              │        ┌─────────┐
         ▼              ▼        │Web Server│
    App Store    Google Play     │(Docker) │
                                 └─────────┘
                                      │
                                      ▼
                                 app.vizta.com
```

## 🌐 Network Request Flow

```
Component
   │
   ├─→ Service Layer (xCompleteService.ts)
   │     │
   │     ├─→ Headers: { 'X-Platform': 'mobile-app' | 'mobile-web' }
   │     │
   │     ▼
   ├─→ Backend (ExtractorW)
   │     │
   │     ├─→ Platform-specific logic (if needed)
   │     │
   │     ▼
   ├─→ Response
   │     │
   │     ▼
   ├─→ Local Storage (PlatformStorage)
   │
   └─→ Supabase Sync (optional)
```

## 📊 Bundle Size Optimization

```
Shared Code (90%)
  ├─→ Components
  ├─→ Services
  ├─→ State Management
  ├─→ Utils
  └─→ Types

Platform-Specific (10%)
  ├─→ Web Only
  │   ├─→ localStorage implementation
  │   ├─→ Web modals
  │   └─→ CSS-specific styles
  │
  └─→ Native Only
      ├─→ MMKV implementation
      ├─→ BottomSheet
      ├─→ Camera/Haptics
      └─→ Native modules
```

## 🔐 Security Considerations

```
┌─────────────────────────────────────────┐
│         Environment Variables           │
├─────────────────────────────────────────┤
│  SUPABASE_URL                           │
│  SUPABASE_ANON_KEY                      │
│  EXTRACTORW_URL                         │
└─────────────────────────────────────────┘
           │
           ├─→ Mobile: Bundled (expo-constants)
           └─→ Web: Build-time injection (dotenv)

⚠️  Never expose service_role keys
⚠️  Use RLS policies in Supabase
⚠️  Validate all user input
⚠️  HTTPS only in production
```

## 🎯 Performance Strategy

```
Optimization Layer
   │
   ├─→ Code Splitting (web)
   │   └─→ Route-based chunks
   │
   ├─→ Lazy Loading
   │   └─→ Heavy components (Skia, Camera)
   │
   ├─→ Image Optimization
   │   └─→ expo-image (native + web)
   │
   ├─→ Bundle Analysis
   │   └─→ Identify heavy dependencies
   │
   └─→ Caching
       ├─→ Service Worker (web PWA)
       └─→ Supabase query caching
```

## 🧪 Testing Matrix

```
┌──────────┬─────────┬─────────┬─────────┐
│ Feature  │  iOS    │ Android │   Web   │
├──────────┼─────────┼─────────┼─────────┤
│ Storage  │ MMKV    │ MMKV    │localStorage│
│ Modals   │BottomSht│BottomSht│  Modal  │
│ Haptics  │   ✓     │   ✓     │   -     │
│ Camera   │   ✓     │   ✓     │MediaAPI │
│ Gestures │   ✓     │   ✓     │   ✓     │
│ Animations│  ✓     │   ✓     │CSS+RN   │
│ Drawer   │   ✓     │   ✓     │   ✓     │
│ Supabase │   ✓     │   ✓     │   ✓     │
└──────────┴─────────┴─────────┴─────────┘
```

## 📈 Monitoring & Analytics

```
Event Tracking
   │
   ├─→ Platform Identifier
   │   ├─→ 'mobile-app' (iOS/Android)
   │   └─→ 'mobile-web' (Browser)
   │
   ├─→ User Actions
   │   ├─→ Save Item
   │   ├─→ Share
   │   ├─→ Navigate
   │   └─→ Settings Change
   │
   ├─→ Errors
   │   ├─→ Storage failures
   │   ├─→ Network errors
   │   └─→ Component crashes
   │
   └─→ Performance
       ├─→ Load time
       ├─→ API latency
       └─→ Render performance
```

## 🔄 Migration Strategy

```
Phase 1: Core Infrastructure
   │
   ├─→ PlatformStorage implementation
   ├─→ Supabase multi-platform config
   └─→ Platform detection utilities
   
Phase 2: Component Adaptation
   │
   ├─→ Modal system
   ├─→ Navigation adjustments
   └─→ UI component audit
   
Phase 3: Feature Parity
   │
   ├─→ All screens functional
   ├─→ Data sync verified
   └─→ Testing complete
   
Phase 4: PWA & Production
   │
   ├─→ Service Worker
   ├─→ Manifest & icons
   ├─→ Docker deployment
   └─→ Monitoring setup
```

## 🎨 Responsive Design System

```
Mobile Native (iOS/Android)
   ├─→ Fixed dimensions
   ├─→ Safe area insets
   └─→ Native UI elements

Mobile Web (<768px)
   ├─→ Full viewport width
   ├─→ Browser chrome aware
   └─→ Touch-optimized

Desktop Web (>=768px)
   ├─→ Centered container (428px max)
   ├─→ Box shadow (mobile frame)
   └─→ Optional permanent drawer
```

## 🔗 Key Integration Points

```
┌─────────────────────────────────────────┐
│          Application Layer              │
├─────────────────────────────────────────┤
│                                         │
│  Components → Services → Storage        │
│       ↓           ↓          ↓         │
│  Platform    Network    Persistence    │
│  Detection   Requests   (MMKV/Local)   │
│       ↓           ↓          ↓         │
│  Adaptation  Headers    Supabase Sync  │
│                                         │
└─────────────────────────────────────────┘
            ↓                    ↓
       ┌────────┐          ┌─────────┐
       │Backend │          │Cloud DB │
       │(ExtractorW)       │(Supabase)│
       └────────┘          └─────────┘
```

---

## 💡 Key Principles

1. **Write Once, Adapt Minimally** - 90% código compartido
2. **Platform Detection at Runtime** - No builds separados
3. **Graceful Degradation** - Features no disponibles → disable/hide
4. **Data Sync via Supabase** - Single source of truth
5. **Storage Abstraction** - Transparent para componentes
6. **Performance First** - Optimizar para cada plataforma
7. **Security Always** - RLS + env vars + validation

---

## 🚀 Next Steps

Refer to `WEB_IMPLEMENTATION_PLAN.md` for detailed implementation checklist.

