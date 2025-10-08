#!/bin/bash

# Script para configurar variables de entorno
# Uso: ./setup-env.sh

echo "🔧 Configurando variables de entorno..."

# Crear archivo .env si no existe
if [ ! -f .env ]; then
  cat > .env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://qqshdccpmypelhmyqnut.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxc2hkY2NwbXlwZWxobXlxbnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMzY3MTEsImV4cCI6MjA2MTYxMjcxMX0.1ICI-sdyfGsCP4-DdXpenX3jsZvHL-O5SH2zXShjZH0
SUPABASE_PROJECT_ID=qqshdccpmypelhmyqnut
SUPABASE_REGION=us-east-2
SUPABASE_DB_HOST=db.qqshdccpmypelhmyqnut.supabase.co
SUPABASE_DB_VERSION=15.8.1.079
SUPABASE_DB_ENGINE=15

# Vibecode Project Configuration
EXPO_PUBLIC_VIBECODE_PROJECT_ID=YOUR_PROJECT_ID_HERE

# OpenAI API
EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE

# ExtractorW URL
EXPO_PUBLIC_EXTRACTORW_URL=https://server.standatpd.com

# Gemini API (para NewsCron system)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE

# Optional APIs
# EXPO_PUBLIC_VIBECODE_GROK_API_KEY=your_grok_api_key_here
# EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
EOF
  echo "✅ Archivo .env creado"
else
  echo "ℹ️  Archivo .env ya existe"
fi

# Hacer el script ejecutable
chmod +x setup-env.sh

echo ""
echo "📝 Próximos pasos:"
echo "1. Edita el archivo .env y agrega tus API keys"
echo "2. El archivo .env ahora PUEDE ser commiteado a git (gitignore modificado)"
echo "3. Ejecuta: bun start"
echo ""
echo "⚠️  IMPORTANTE: Si tienes API keys sensibles, usa .env.local en su lugar"

