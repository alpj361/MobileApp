# Diagnóstico de Error: ERR_ADDRESS_INVALID en Async Jobs

## Problema Reportado

```
GET https://server.standatpd.com/api/x/job-status/... net::ERR_ADDRESS_INVALID
POST https://server.standatpd.com/api/x/process-async net::ERR_ADDRESS_INVALID
```

## Análisis del Error

`ERR_ADDRESS_INVALID` en Chrome significa que la URL está **malformada** o contiene caracteres inválidos. NO es un problema de:
- ❌ DNS (sería ERR_NAME_NOT_RESOLVED)
- ❌ CORS (sería un error de CORS policy)
- ❌ Servidor caído (sería ERR_CONNECTION_REFUSED)

## Observaciones de los Logs

1. ✅ **Primera llamada funciona**: El job se crea exitosamente
   ```
   [X Async] Job created: f99d49d2-2537-4956-a481-3a839fff1425
   ```

2. ❌ **Llamadas subsecuentes fallan**: El polling falla con ERR_ADDRESS_INVALID

3. 🔍 **Patrón**: Algunas llamadas funcionan, otras no

## Posibles Causas

### 1. Problema de Construcción de URL
La URL podría estar siendo construida incorrectamente en algunos casos, posiblemente:
- Espacios en la URL
- Caracteres especiales no codificados
- Doble slash (`//`)
- URL undefined o null

### 2. Problema de Timing/Race Condition
El error podría ocurrir cuando:
- La URL se construye antes de que las variables de entorno estén disponibles
- Hay un race condition en la inicialización

### 3. Problema de Mixed Content (HTTP/HTTPS)
Si la app web está en HTTP pero intenta conectar a HTTPS, algunos navegadores lo bloquean.

## Pasos de Diagnóstico

### Paso 1: Verificar URLs Construidas
Agregar logging detallado en `getApiUrl()` para ver exactamente qué URLs se están generando.

### Paso 2: Verificar Variables de Entorno
Confirmar que `EXPO_PUBLIC_EXTRACTORW_URL` está correctamente configurada en el build web.

### Paso 3: Verificar Protocolo
Confirmar si la app web está corriendo en HTTP o HTTPS y si hay conflicto con el backend.

### Paso 4: Verificar Headers
Los headers podrían estar causando que el navegador rechace la petición.

## Solución Propuesta

1. **Agregar logging detallado** en `getApiUrl()` para ver las URLs exactas
2. **Verificar que las variables de entorno** estén disponibles en el build web
3. **Considerar usar proxy** si hay problemas de Mixed Content
4. **Verificar que el servidor** `server.standatpd.com` esté accesible desde el navegador

## Próximos Pasos

1. Verificar en la consola del navegador si puedes hacer `fetch('https://server.standatpd.com/api/health')` manualmente
2. Revisar las Network tabs del DevTools para ver la URL exacta que está fallando
3. Agregar más logging para capturar la URL antes de hacer el fetch
