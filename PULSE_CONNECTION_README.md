# 🔗 Conexión con Pulse Journal

## 📋 Descripción

Sistema de conexión entre la app móvil y Pulse Journal que permite al usuario vincular su cuenta existente para futuras integraciones.

## ✨ Características

- **Conexión con Google OAuth**: Usando el mismo client ID de Pulse Journal
- **Conexión con Email/Password**: Verificación de cuenta existente
- **Interfaz moderna**: Mantiene la estética de la app con transiciones suaves
- **Estados visuales claros**: Conectado, conectando, desconectado
- **Persistencia**: El estado de conexión se mantiene entre sesiones
- **Integración completa**: Disponible en la pantalla de Configuración

## 🎯 Cómo Usar

### 1. Acceder a Configuración
- Abrir el menú lateral (hamburger menu)
- Ir a "Configuración"
- Encontrar la sección "Conexiones"

### 2. Conectar con Pulse Journal
**Opción A: Google OAuth**
- Tocar el botón "Google"
- Completar la autenticación en el navegador
- La app verificará automáticamente si existe una cuenta en Pulse Journal

**Opción B: Email/Password**
- Tocar el botón "Email"
- Ingresar email y contraseña
- La app verificará que la cuenta existe en Pulse Journal

### 3. Estados de Conexión
- **No conectado**: Muestra opciones para conectar
- **Conectando**: Animación de carga
- **Conectado**: Muestra información del usuario y opción de desconectar

## 🎨 Componentes Disponibles

### PulseConnectionCard
Componente principal para la conexión. Se integra automáticamente en SettingsScreen.

```tsx
import PulseConnectionCard from '../components/PulseConnectionCard';

// Uso
<PulseConnectionCard />
```

### PulseUserIndicator
Componente para mostrar el estado de conexión en otras partes de la app.

```tsx
import PulseUserIndicator from '../components/PulseUserIndicator';

// Variantes disponibles
<PulseUserIndicator variant="full" showCredits={true} />
<PulseUserIndicator variant="minimal" showCredits={true} />
<PulseUserIndicator variant="icon-only" />
```

## 🔧 Store de Estado

### usePulseConnectionStore
Store principal que maneja el estado de conexión.

```tsx
import { usePulseConnectionStore } from '../state/pulseConnectionStore';

const {
  isConnected,
  isConnecting,
  connectedUser,
  connectWithGoogle,
  connectWithEmail,
  disconnect
} = usePulseConnectionStore();
```

### Selectores Útiles
```tsx
import { useIsConnected, usePulseUser } from '../state/pulseConnectionStore';

const isConnected = useIsConnected();
const user = usePulseUser();
```

## 🚀 Servicios

### pulseAuth.ts
Servicio que maneja la autenticación y verificación de usuarios.

#### Funciones principales:
- `connectWithGoogle()`: OAuth con Google
- `connectWithEmail(email, password)`: Verificación por email
- `verifyPulseUser(email)`: Verificar si usuario existe
- `isValidEmail(email)`: Validar formato de email

## 🎛️ Configuración

### Google OAuth
- **Client ID**: `80973030831-7v96jltgkg4r31r8n68du9vjpjutuq3o.apps.googleusercontent.com`
- **Scopes**: `openid email profile`
- **Mismo client ID** que usa Pulse Journal web para consistencia

### Supabase
- **Tabla**: `profiles`
- **Campos verificados**: `id`, `email`, `user_type`, `role`, `credits`
- **Sin autenticación completa**: Solo verificación de existencia

## 🔒 Seguridad

- **PKCE**: Implementado para OAuth flow seguro
- **Solo verificación**: No se crean sesiones completas de autenticación
- **Misma infraestructura**: Usa la misma base de datos que Pulse Journal
- **Datos persistidos**: Solo información no sensible se guarda localmente

## 🎨 Estética y UX

- **Colores consistentes**: Grises suaves, azul principal, verde para conectado
- **Transiciones suaves**: Animaciones con `react-native-reanimated`
- **Feedback visual**: Estados claros y retroalimentación inmediata
- **Diseño responsive**: Se adapta a diferentes tamaños de pantalla

## 🔮 Preparación para Futuro

Esta implementación está diseñada para ser expandida fácilmente:

- **Base sólida**: Para futuras integraciones complejas
- **Arquitectura limpia**: Separación entre conexión y autenticación
- **Extensible**: Fácil agregar nuevos métodos de conexión
- **Modular**: Componentes reutilizables para otras partes de la app

## 🐛 Troubleshooting

### Problemas comunes:
1. **Error de Google OAuth**: Verificar que el client ID sea correcto
2. **Usuario no encontrado**: Asegurar que el email existe en Pulse Journal
3. **Error de conexión**: Verificar conectividad a Supabase
4. **Animaciones lentas**: Dispositivos más antiguos pueden requerir ajustes

### Logs útiles:
- Check console para errores de autenticación
- Verificar estado de Supabase en desarrollo
- Confirmar que las dependencias están instaladas correctamente
