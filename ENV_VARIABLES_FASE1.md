# Variables de Entorno - Fase 1: Periodista + Verificación de Fuentes

Agregar estas variables al archivo `.env` en el servidor VPS:

```bash
# ==================== VIZTA JOURNALIST MODE ====================

# Media Bias/Fact Check API (RapidAPI)
# Obtener en: https://rapidapi.com/hub
MBFC_RAPIDAPI_KEY=8d9a941f80msh0e1395de39fdb9ep1984b6jsn879ef5123cf4

# ==================== EXISTING VARIABLES (ya configuradas) ====================

# Dual Model Flow
VIZTA_USE_DUAL_MODEL=true

# Grok (xAI)
XAI_API_KEY=your_xai_api_key

# OpenPipe (Tool Calling)
OPENPIPE_API_KEY=your_openpipe_key
OPENPIPE_MODEL=gpt-4o-mini
```

## Verificación

Para verificar que las variables están configuradas correctamente, ejecuta en el servidor VPS:

```bash
# SSH al VPS
ssh user@your-vps-ip

# Verificar variables
cd /path/to/ExtractorW
cat .env | grep MBFC
cat .env | grep VIZTA_USE_DUAL_MODEL
cat .env | grep XAI_API_KEY

# Reiniciar servicio después de agregar variables
docker-compose restart extractorw-api
```

## Testing

Una vez configurado, puedes probar con:

```bash
# Ver logs en tiempo real
docker-compose logs -f extractorw-api

# Buscar logs de verificación de fuentes
docker-compose logs extractorw-api | grep "SOURCE_VERIFIER"
```

Deberías ver logs como:
```
[SOURCE_VERIFIER] ✅ Initialized with MBFC API
[SOURCE_VERIFIER] 🔍 Verifying source: prensalibre.com
[SOURCE_VERIFIER] ✓ prensalibre.com → Credibility: High, Bias: Center, Score: 85
[REASONING_LAYER] 📊 Source quality: 3 high, 1 medium, 0 low
```
