# Schema: async_jobs

Tabla para almacenar y gestionar jobs asincrónicos (procesamiento de posts de X/Twitter, etc.) con soporte para usuarios invitados y autenticados.

## Estructura de la Tabla

```sql
CREATE TABLE public.async_jobs (
  -- Identificador
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Datos del Job
  url               TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'queued',
  progress          INTEGER NOT NULL DEFAULT 0,

  -- Resultados
  result            JSONB,
  error             TEXT,

  -- Ownership (guest XOR user)
  guest_id          UUID → guest_users(guest_id) ON DELETE CASCADE,
  user_id           UUID → auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  metadata          JSONB DEFAULT '{}'::jsonb,

  -- Constraints
  CONSTRAINT chk_user_or_guest CHECK (
    (guest_id IS NOT NULL AND user_id IS NULL) OR
    (guest_id IS NULL AND user_id IS NOT NULL)
  ),
  CONSTRAINT chk_valid_status CHECK (
    status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')
  ),
  CONSTRAINT chk_valid_progress CHECK (
    progress >= 0 AND progress <= 100
  )
);
```

## Columnas

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Identificador único del job |
| `url` | TEXT | NO | - | URL a procesar (ej: post de X) |
| `status` | TEXT | NO | `'queued'` | Estado del job |
| `progress` | INTEGER | NO | `0` | Progreso 0-100% |
| `result` | JSONB | SÍ | NULL | Resultado del job (JSON) |
| `error` | TEXT | SÍ | NULL | Mensaje de error si falló |
| `guest_id` | UUID | SÍ | NULL | ID del guest (XOR con user_id) |
| `user_id` | UUID | SÍ | NULL | ID del usuario autenticado (XOR con guest_id) |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Última actualización (auto) |
| `metadata` | JSONB | NO | `{}` | Metadata adicional |

## Estados Válidos

| Estado | Descripción |
|--------|-------------|
| `queued` | Job creado, esperando procesamiento |
| `processing` | Job siendo procesado actualmente |
| `completed` | Job completado exitosamente |
| `failed` | Job falló con error |
| `cancelled` | Job cancelado por usuario |

## Constraints

### 1. chk_user_or_guest
**Regla crítica:** Un job DEBE tener `guest_id` O `user_id`, pero NO ambos y NO ninguno.

```sql
-- ✅ Válido
guest_id = 'xxx', user_id = NULL

-- ✅ Válido
guest_id = NULL, user_id = 'yyy'

-- ❌ Inválido
guest_id = NULL, user_id = NULL

-- ❌ Inválido
guest_id = 'xxx', user_id = 'yyy'
```

### 2. chk_valid_status
Solo permite estados definidos: `queued`, `processing`, `completed`, `failed`, `cancelled`

### 3. chk_valid_progress
El progreso debe estar entre 0 y 100

## Índices

### Índices Principales
```sql
-- Por guest_id (solo no nulos)
idx_async_jobs_guest_id

-- Por user_id (solo no nulos)
idx_async_jobs_user_id

-- Por status
idx_async_jobs_status

-- Por fechas
idx_async_jobs_created_at
idx_async_jobs_updated_at

-- Por URL
idx_async_jobs_url
```

### Índices Compuestos (Optimizados)
```sql
-- Jobs activos en general
idx_async_jobs_active
WHERE status IN ('queued', 'processing')

-- Jobs activos de guest
idx_async_jobs_guest_active
WHERE guest_id IS NOT NULL AND status IN ('queued', 'processing')

-- Jobs activos de user
idx_async_jobs_user_active
WHERE user_id IS NOT NULL AND status IN ('queued', 'processing')

-- Para limpieza
idx_async_jobs_cleanup
WHERE status IN ('completed', 'failed', 'cancelled')
```

## Triggers

### update_async_job_updated_at_trigger
Actualiza automáticamente `updated_at` a `NOW()` en cada UPDATE.

```sql
-- Se ejecuta automáticamente
UPDATE async_jobs SET status = 'completed' WHERE id = '...';
-- updated_at se actualiza solo ✅
```

## Row Level Security (RLS)

### Políticas Activas

1. **Service Role** - Acceso completo (backend)
2. **Guests** - Solo pueden ver/modificar sus propios jobs (via X-Guest-Id header)
3. **Authenticated Users** - Solo pueden ver/modificar sus propios jobs
4. **Anonymous** - Pueden SELECT e INSERT (para guests)

### Verificación de Ownership

El RLS usa:
- `auth.uid()` para usuarios autenticados
- `request.headers->>'x-guest-id'` para guests

**Importante:** Debes enviar el header `X-Guest-Id` en las peticiones desde el frontend.

## Ejemplos de Uso

### Crear Job (Guest)
```sql
INSERT INTO public.async_jobs (url, guest_id, status)
VALUES (
  'https://x.com/user/status/123',
  '11111111-1111-1111-1111-111111111111',
  'queued'
)
RETURNING *;
```

### Crear Job (Authenticated User)
```sql
INSERT INTO public.async_jobs (url, user_id, status)
VALUES (
  'https://x.com/user/status/123',
  auth.uid(),  -- Usuario actual autenticado
  'queued'
)
RETURNING *;
```

### Actualizar Progreso
```sql
UPDATE public.async_jobs
SET
  status = 'processing',
  progress = 50,
  metadata = jsonb_set(metadata, '{last_check}', to_jsonb(NOW()))
WHERE id = 'job-uuid';
-- updated_at se actualiza automáticamente
```

### Completar Job
```sql
UPDATE public.async_jobs
SET
  status = 'completed',
  progress = 100,
  result = '{
    "transcription": "...",
    "entities": [...],
    "metadata": {...}
  }'::jsonb
WHERE id = 'job-uuid';
```

### Marcar como Fallido
```sql
UPDATE public.async_jobs
SET
  status = 'failed',
  error = 'Timeout error: job took too long'
WHERE id = 'job-uuid';
```

### Obtener Jobs Activos de Guest
```sql
SELECT * FROM public.async_jobs
WHERE guest_id = '11111111-1111-1111-1111-111111111111'
  AND status IN ('queued', 'processing')
ORDER BY created_at DESC;
```

### Obtener Jobs Activos de User
```sql
SELECT * FROM public.async_jobs
WHERE user_id = auth.uid()
  AND status IN ('queued', 'processing')
ORDER BY created_at DESC;
```

### Migrar Jobs de Guest a User
```sql
-- Se hace via función (ver 003_create_guest_job_functions.sql)
SELECT * FROM migrate_guest_jobs(
  'guest-uuid',
  'user-uuid'
);
```

## Limpieza Automática

### Cleanup de Jobs Completados
```sql
-- Eliminar jobs completados/fallidos de hace 7+ días
DELETE FROM public.async_jobs
WHERE status IN ('completed', 'failed', 'cancelled')
  AND updated_at < NOW() - INTERVAL '7 days';
```

### Via Función
```sql
-- Usar función helper
SELECT * FROM cleanup_old_jobs(7);  -- 7 días
```

## Estructura del Result JSON

Cuando un job completa, `result` debería tener esta estructura:

```json
{
  "media": {
    "post_id": "1234567890",
    "type": "video",
    "video_url": "https://...",
    "thumbnail_url": "https://...",
    "images": []
  },
  "transcription": "Texto transcrito del video...",
  "vision": "Descripción visual...",
  "entities": [
    {
      "name": "Entity Name",
      "type": "person",
      "priority": "high",
      "category": "people"
    }
  ],
  "metrics": {
    "likes": 100,
    "retweets": 50,
    "replies": 25,
    "views": 1000
  },
  "tweet": {
    "text": "Tweet text...",
    "author_handle": "@username",
    "author_name": "Display Name"
  }
}
```

## Metadata Común

El campo `metadata` puede contener:

```json
{
  "item_id": "saved-item-uuid",
  "platform": "x",
  "retry_count": 0,
  "last_check": "2025-11-08T...",
  "processing_time_ms": 12345,
  "server_id": "worker-1"
}
```

## Permisos

```sql
-- Service role: TODOS los permisos
GRANT ALL ON public.async_jobs TO service_role;

-- Authenticated: SELECT, INSERT, UPDATE, DELETE
GRANT SELECT, INSERT, UPDATE, DELETE ON public.async_jobs TO authenticated;

-- Anonymous (guests): SELECT, INSERT, UPDATE
GRANT SELECT, INSERT, UPDATE ON public.async_jobs TO anon;
```

## Foreign Keys

### guest_id → guest_users
- **ON DELETE CASCADE**: Si se elimina el guest, se eliminan sus jobs
- Esto es correcto porque guests se limpian solo después de 30 días inactivos

### user_id → auth.users
- **ON DELETE CASCADE**: Si se elimina el usuario, se eliminan sus jobs
- Comportamiento estándar de Supabase

## Notas Importantes

1. **Constraint crítico:** `chk_user_or_guest` previene jobs huérfanos
2. **Auto-update:** `updated_at` se actualiza automáticamente
3. **RLS activo:** Los guests solo ven sus jobs (via X-Guest-Id header)
4. **Índices optimizados:** Queries de jobs activos son muy rápidas
5. **Limpieza:** Jobs completados se auto-eliminan después de 7 días
6. **Progreso:** Siempre entre 0-100, valida automáticamente
7. **Status:** Solo valores válidos permitidos

## Queries Comunes Optimizadas

### Jobs activos por guest (RÁPIDO)
```sql
-- Usa: idx_async_jobs_guest_active
SELECT * FROM async_jobs
WHERE guest_id = $1
  AND status IN ('queued', 'processing')
ORDER BY created_at DESC;
```

### Jobs para cleanup (RÁPIDO)
```sql
-- Usa: idx_async_jobs_cleanup
SELECT * FROM async_jobs
WHERE status IN ('completed', 'failed')
  AND updated_at < NOW() - INTERVAL '7 days';
```

### Buscar job por URL (RÁPIDO)
```sql
-- Usa: idx_async_jobs_url
SELECT * FROM async_jobs
WHERE url = $1
ORDER BY created_at DESC
LIMIT 1;
```

## Ver También

- `001_create_guest_users_table.sql` - Tabla guest_users
- `003_create_guest_job_functions.sql` - Funciones helpers
- `MIGRATION_GUIDE.md` - Guía completa de migración
