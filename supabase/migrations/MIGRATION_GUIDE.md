# Supabase Migration Guide - Guest User System

Guía completa para migrar tu base de datos Supabase para soportar el sistema de usuarios invitados.

## 📋 Pre-requisitos

- Acceso a tu proyecto Supabase
- Tabla `async_jobs` ya creada
- CLI de Supabase instalado (opcional pero recomendado)

## 🚀 Ejecución de Migraciones

### Opción 1: Usando Supabase Dashboard (Recomendado)

1. Ve a tu proyecto en https://app.supabase.com
2. Navega a **SQL Editor** en el menú lateral
3. Ejecuta las migraciones en orden:

```sql
-- 1. Crear tabla guest_users
-- Copia y pega el contenido de: 001_create_guest_users_table.sql

-- 2. Modificar async_jobs
-- Copia y pega el contenido de: 002_modify_async_jobs_for_guest_support.sql

-- 3. Crear funciones
-- Copia y pega el contenido de: 003_create_guest_job_functions.sql

-- 4. Crear cleanup jobs (opcional)
-- Copia y pega el contenido de: 004_create_cleanup_cron_jobs.sql
```

### Opción 2: Usando Supabase CLI

```bash
# Desde la raíz del proyecto
cd /home/user/MobileApp

# Link a tu proyecto
supabase link --project-ref YOUR_PROJECT_REF

# Aplicar migraciones
supabase db push
```

## 📊 Verificación de Migraciones

Después de ejecutar las migraciones, verifica que todo esté correcto:

### 1. Verificar tabla guest_users

```sql
-- Debe mostrar la estructura de la tabla
\d public.guest_users

-- O en Dashboard SQL Editor:
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'guest_users';
```

### 2. Verificar columnas en async_jobs

```sql
-- Debe mostrar guest_id y user_id
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'async_jobs'
  AND column_name IN ('guest_id', 'user_id');
```

### 3. Verificar funciones

```sql
-- Debe listar todas las funciones creadas
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%guest%' OR routine_name LIKE '%job%';
```

### 4. Verificar índices

```sql
-- Debe mostrar todos los índices creados
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('guest_users', 'async_jobs')
ORDER BY tablename, indexname;
```

## 🔄 Migración de Datos Existentes

Si ya tienes jobs en producción, necesitas backfill de `user_id`:

```sql
-- Opción A: Si tienes una forma de asociar jobs con users
-- (ajusta según tu esquema actual)
UPDATE public.async_jobs
SET user_id = (
  SELECT user_id
  FROM some_association_table
  WHERE some_association_table.job_id = async_jobs.id
)
WHERE user_id IS NULL;

-- Opción B: Si no puedes asociar, asigna a un usuario "system"
-- Primero crea un guest ID para jobs huérfanos
INSERT INTO public.guest_users (guest_id, device_platform)
VALUES ('00000000-0000-0000-0000-000000000000', 'legacy');

UPDATE public.async_jobs
SET guest_id = '00000000-0000-0000-0000-000000000000'
WHERE user_id IS NULL AND guest_id IS NULL;
```

## 🧪 Pruebas de las Funciones

### Probar get_active_jobs

```sql
-- Crear un guest de prueba
INSERT INTO public.guest_users (guest_id, device_platform)
VALUES ('11111111-1111-1111-1111-111111111111', 'web');

-- Crear un job de prueba
INSERT INTO public.async_jobs (
  id, url, status, progress, guest_id
) VALUES (
  gen_random_uuid(),
  'https://x.com/test',
  'processing',
  50,
  '11111111-1111-1111-1111-111111111111'
);

-- Probar la función
SELECT * FROM public.get_active_jobs(
  '11111111-1111-1111-1111-111111111111'::uuid,
  NULL
);
```

### Probar migración

```sql
-- Migrar jobs de guest a user
SELECT * FROM public.migrate_guest_jobs(
  '11111111-1111-1111-1111-111111111111'::uuid,
  auth.uid() -- o un UUID de usuario real
);

-- Verificar migración
SELECT guest_id, user_id, url, status
FROM public.async_jobs
WHERE user_id = auth.uid();
```

### Probar cleanup

```sql
-- Ejecutar cleanup (esto es seguro, solo elimina jobs viejos)
SELECT * FROM public.run_scheduled_cleanup();
```

## 🔐 Seguridad (Row Level Security)

Las políticas RLS ya están configuradas en las migraciones. Verificar:

```sql
-- Ver políticas de guest_users
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'guest_users';

-- Ver políticas de async_jobs
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'async_jobs';
```

## ⚙️ Configuración de Backend

Después de las migraciones, actualiza tu backend (extractorw-api):

### 1. Middleware para session identifier

```javascript
// Extrae guest_id o user_id de headers
app.use((req, res, next) => {
  req.guestId = req.headers['x-guest-id'];
  req.userId = req.headers['x-user-id'];
  next();
});
```

### 2. Modificar POST /api/x/process-async

```javascript
app.post('/api/x/process-async', async (req, res) => {
  const { url, guestId, userId } = req.body;

  // Crear job con guest_id o user_id
  const job = await createJob({
    url,
    guest_id: guestId || req.guestId,
    user_id: userId || req.userId,
    status: 'queued'
  });

  res.json({ success: true, jobId: job.id });
});
```

### 3. Implementar GET /api/jobs/active

```javascript
app.get('/api/jobs/active', async (req, res) => {
  const guestId = req.headers['x-guest-id'];
  const userId = req.headers['x-user-id'];

  const { data, error } = await supabase.rpc('get_active_jobs', {
    p_guest_id: guestId,
    p_user_id: userId
  });

  if (error) {
    return res.status(500).json({ success: false, error });
  }

  res.json({ success: true, jobs: data });
});
```

### 4. Implementar POST /api/jobs/migrate-guest

```javascript
app.post('/api/jobs/migrate-guest', async (req, res) => {
  const { guestId, userId } = req.body;

  const { data, error } = await supabase.rpc('migrate_guest_jobs', {
    p_guest_id: guestId,
    p_user_id: userId
  });

  if (error) {
    return res.status(500).json({ success: false, error });
  }

  res.json({
    success: true,
    migratedJobs: data[0].migrated_count,
    message: data[0].message
  });
});
```

## 🔧 Limpieza Automática

### Opción 1: Supabase Pro (pg_cron)

Si tienes Supabase Pro, descomenta las líneas en `004_create_cleanup_cron_jobs.sql`.

### Opción 2: GitHub Actions (Free tier)

Crea `.github/workflows/cleanup-jobs.yml`:

```yaml
name: Cleanup Old Jobs
on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM UTC

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Run cleanup
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: |
          curl -X POST "$SUPABASE_URL/rest/v1/rpc/run_scheduled_cleanup" \
            -H "apikey: $SUPABASE_KEY" \
            -H "Authorization: Bearer $SUPABASE_KEY" \
            -H "Content-Type: application/json"
```

### Opción 3: Backend API Endpoint

```javascript
// Llama esto desde tu backend en un cron job
app.post('/api/admin/cleanup', async (req, res) => {
  const { data, error } = await supabase.rpc('run_scheduled_cleanup');
  res.json({ success: !error, data });
});
```

## 🔄 Rollback (Si algo sale mal)

Si necesitas revertir las migraciones:

```sql
-- CUIDADO: Esto eliminará las tablas y funciones

-- 1. Eliminar funciones
DROP FUNCTION IF EXISTS public.get_active_jobs CASCADE;
DROP FUNCTION IF EXISTS public.get_guest_pending_jobs_count CASCADE;
DROP FUNCTION IF EXISTS public.migrate_guest_jobs CASCADE;
DROP FUNCTION IF EXISTS public.verify_job_ownership CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_jobs CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_inactive_guests CASCADE;
DROP FUNCTION IF EXISTS public.run_scheduled_cleanup CASCADE;

-- 2. Revertir async_jobs
ALTER TABLE public.async_jobs DROP CONSTRAINT IF EXISTS chk_user_or_guest;
ALTER TABLE public.async_jobs DROP COLUMN IF EXISTS guest_id;
ALTER TABLE public.async_jobs DROP COLUMN IF EXISTS user_id;

-- 3. Eliminar tabla guest_users
DROP TABLE IF EXISTS public.guest_users CASCADE;
```

## ✅ Checklist Post-Migración

- [ ] Migraciones ejecutadas sin errores
- [ ] Tablas creadas correctamente
- [ ] Índices creados
- [ ] Funciones creadas
- [ ] RLS policies activas
- [ ] Datos existentes migrados (si aplicable)
- [ ] Backend actualizado con nuevos endpoints
- [ ] Middleware de session identifier implementado
- [ ] Pruebas de creación de jobs con guest_id
- [ ] Pruebas de migración de guest a user
- [ ] Pruebas de recuperación de jobs al reload
- [ ] Cleanup automático configurado

## 📞 Soporte

Si encuentras problemas:
1. Verifica los logs de Supabase Dashboard
2. Revisa las políticas RLS
3. Asegúrate que los headers se envían correctamente
4. Verifica que el constraint `chk_user_or_guest` no bloquee inserts

## 📝 Notas Importantes

- Los jobs ahora REQUIEREN `guest_id` O `user_id` (no ambos)
- Los guests son identificados por UUID generado en frontend
- La migración es automática al conectar Pulse Journal
- Los guests inactivos se limpian después de 30 días
- Los jobs completados se limpian después de 7 días
