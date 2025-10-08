# Configuración de Variables de Entorno

## ✅ SOLUCIÓN: .env ya NO se borrará en commits

El `.gitignore` ha sido modificado para permitir que el archivo `.env` sea commiteado a git.
Esto es ideal para tu setup de Docker local + VPS.

## Configuración Rápida

Ejecuta el script de setup:

```bash
chmod +x setup-env.sh
./setup-env.sh
```

O crea el archivo `.env` manualmente con los valores a continuación:

## Variables Requeridas

```bash
# Supabase Configuration
SUPABASE_URL=https://qqshdccpmypelhmyqnut.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxc2hkY2NwbXlwZWxobXlxbnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMzY3MTEsImV4cCI6MjA2MTYxMjcxMX0.1ICI-sdyfGsCP4-DdXpenX3jsZvHL-O5SH2zXShjZH0
SUPABASE_PROJECT_ID=qqshdccpmypelhmyqnut
SUPABASE_REGION=us-east-2
SUPABASE_DB_HOST=db.qqshdccpmypelhmyqnut.supabase.co
SUPABASE_DB_VERSION=15.8.1.079
SUPABASE_DB_ENGINE=15

# Vibecode Project Configuration (REQUERIDO para image-generation)
EXPO_PUBLIC_VIBECODE_PROJECT_ID=tu_project_id_aqui

# OpenAI API (para chat y transcripción)
EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY=tu_openai_api_key_aqui

# Grok API (opcional)
EXPO_PUBLIC_VIBECODE_GROK_API_KEY=tu_grok_api_key_aqui

# Anthropic API (opcional)
EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY=tu_anthropic_api_key_aqui

# ExtractorW URL (tiene valor por defecto)
EXPO_PUBLIC_EXTRACTORW_URL=https://server.standatpd.com

# Gemini API (para NewsCron system)
GEMINI_API_KEY=tu_gemini_api_key_aqui
```

## Variables con Valores por Defecto

Estas variables tienen valores por defecto en el código, pero puedes sobrescribirlas:

- `EXPO_PUBLIC_EXTRACTORW_URL`: Default → `https://server.standatpd.com`

## Cómo Crear el Archivo .env

Ejecuta este comando en la terminal:

```bash
cat > .env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://qqshdccpmypelhmyqnut.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxc2hkY2NwbXlwZWxobXlxbnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMzY3MTEsImV4cCI6MjA2MTYxMjcxMX0.1ICI-sdyfGsCP4-DdXpenX3jsZvHL-O5SH2zXShjZH0
SUPABASE_PROJECT_ID=qqshdccpmypelhmyqnut
SUPABASE_REGION=us-east-2

EXPO_PUBLIC_VIBECODE_PROJECT_ID=YOUR_PROJECT_ID_HERE
EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
EXPO_PUBLIC_EXTRACTORW_URL=https://server.standatpd.com
EOF
```

Luego reemplaza `YOUR_PROJECT_ID_HERE` y `YOUR_OPENAI_API_KEY_HERE` con tus valores reales.

## Estado Actual

✅ Dependencias instaladas correctamente (1123 packages)
✅ `.gitignore` modificado - `.env` ahora puede commitearse
✅ Errores de TypeScript corregidos en `improved-link-processor.ts`
❌ Archivo `.env` no existe (usa `./setup-env.sh` para crearlo)
⚠️  Variables de entorno requeridas no configuradas

## Estrategias de Configuración

### Opción 1: Commitear .env (Actual - Recomendado para Docker)
- ✅ `.env` se incluye en git
- ✅ Funciona en local y VPS automáticamente
- ⚠️  **NO incluyas API keys sensibles**, usa valores de desarrollo
- 💡 Usa variables de entorno del sistema en producción

### Opción 2: Usar .env.local (Más seguro)
- Renombra `.env` a `.env.local`
- `.env.local` está en `.gitignore` y nunca se commitea
- Debes crear `.env.local` manualmente en cada ambiente
- Más seguro para API keys sensibles

### Opción 3: Docker Secrets/Environment (Producción)
- Define variables en `docker-compose.yml` o Dockerfile
- Usa archivos de secrets en producción
- El `.env` solo para valores base sin credenciales

## Próximos Pasos

1. Ejecuta `./setup-env.sh` para crear el `.env`
2. Edita `.env` y configura tus API keys
3. Commitea el `.env` a git: `git add .env && git commit -m "Add env config"`
4. En VPS/producción, sobrescribe valores sensibles con variables de entorno del sistema
5. Ejecuta `bun start` para iniciar la aplicación

## Seguridad

⚠️  **IMPORTANTE**: 
- Si usas API keys de producción, NO las commitees
- Usa valores de desarrollo en `.env` commiteado
- Sobrescribe con variables de entorno reales en Docker:
  ```yaml
  # docker-compose.yml
  environment:
    - EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY=${OPENAI_KEY}
  ```

