# Supabase Migrations - Guest User System

Sistema de persistencia de jobs en backend con soporte para usuarios invitados y autenticados.

## 📁 Estructura de Archivos

```
supabase/
├── README.md (este archivo)
├── migrations/
│   ├── 001_create_guest_users_table.sql          # Crea tabla guest_users
│   ├── 002_modify_async_jobs_for_guest_support.sql # Modifica async_jobs
│   ├── 003_create_guest_job_functions.sql        # Funciones helpers
│   ├── 004_create_cleanup_cron_jobs.sql          # Cleanup automático
│   ├── 005_backfill_existing_data.sql            # Migración de datos (opcional)
│   ├── MIGRATION_GUIDE.md                        # Guía completa de migración
│   └── FUNCTION_USAGE_EXAMPLES.md                # Ejemplos de uso
```

## 🚀 Quick Start

### 1. Ejecutar Migraciones

**Opción A: Supabase Dashboard**
1. Ve a https://app.supabase.com
2. SQL Editor → New Query
3. Ejecuta cada archivo SQL en orden (001, 002, 003, 004)

**Opción B: Supabase CLI**
```bash
supabase db push
```

### 2. Verificar

```sql
-- Verificar tablas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('guest_users', 'async_jobs');

-- Verificar funciones
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public';
```

### 3. Migrar Datos Existentes (si aplica)

```bash
# Ejecutar script de backfill
# Ver: 005_backfill_existing_data.sql
```

## 📊 Schema Overview

### guest_users
```
guest_id (PK)           UUID
created_at              TIMESTAMPTZ
last_active_at          TIMESTAMPTZ
device_platform         VARCHAR(20)
migrated_to_user_id     UUID → auth.users
migrated_at             TIMESTAMPTZ
```

### async_jobs (modificaciones)
```
+ guest_id              UUID → guest_users
+ user_id               UUID → auth.users
+ constraint: (guest_id XOR user_id) NOT NULL
```

## 🔧 Funciones Disponibles

| Función | Propósito |
|---------|-----------|
| `get_active_jobs(guest_id, user_id)` | Obtener jobs activos del usuario/guest |
| `get_guest_pending_jobs_count(guest_id)` | Contar jobs pendientes de un guest |
| `migrate_guest_jobs(guest_id, user_id)` | Migrar jobs de guest a user |
| `verify_job_ownership(job_id, guest_id, user_id)` | Verificar si job pertenece al usuario |
| `cleanup_old_jobs(days_old)` | Limpiar jobs completados antiguos |
| `cleanup_inactive_guests(days_inactive)` | Limpiar guests inactivos |
| `run_scheduled_cleanup()` | Ejecutar todas las tareas de limpieza |

## 📖 Documentación

- **[MIGRATION_GUIDE.md](./migrations/MIGRATION_GUIDE.md)** - Guía completa de migración
- **[FUNCTION_USAGE_EXAMPLES.md](./FUNCTION_USAGE_EXAMPLES.md)** - Ejemplos de código backend

## 🔐 Seguridad

- ✅ Row Level Security (RLS) habilitado en todas las tablas
- ✅ Políticas para guests y usuarios autenticados
- ✅ Validación de ownership en todas las operaciones
- ✅ Constraint para prevenir jobs sin dueño

## 🧹 Limpieza Automática

### Jobs Completados
- Se eliminan después de 7 días
- Configurable con `cleanup_old_jobs(days)`

### Guests Inactivos
- Se eliminan después de 30 días sin actividad
- Solo si no están migrados
- Configurable con `cleanup_inactive_guests(days)`

### Configuración

**Supabase Pro (pg_cron):**
```sql
-- Ya incluido en 004_create_cleanup_cron_jobs.sql
-- Descomenta las líneas de cron
```

**Free Tier (GitHub Actions):**
```yaml
# Ver MIGRATION_GUIDE.md para setup completo
```

## 🧪 Testing

```sql
-- Crear guest de prueba
INSERT INTO guest_users (guest_id, device_platform)
VALUES ('test-guest-id', 'web');

-- Crear job de prueba
INSERT INTO async_jobs (id, url, status, progress, guest_id)
VALUES (gen_random_uuid(), 'https://test.com', 'processing', 50, 'test-guest-id');

-- Obtener jobs activos
SELECT * FROM get_active_jobs('test-guest-id'::uuid, NULL);

-- Migrar a usuario
SELECT * FROM migrate_guest_jobs('test-guest-id'::uuid, auth.uid());
```

## 📞 Soporte

Si tienes problemas:
1. Revisa [MIGRATION_GUIDE.md](./migrations/MIGRATION_GUIDE.md)
2. Verifica logs en Supabase Dashboard
3. Asegúrate que RLS policies están activas
4. Verifica que el constraint `chk_user_or_guest` no bloquea inserts

## ✅ Checklist

- [ ] Migraciones ejecutadas (001-004)
- [ ] Tablas verificadas
- [ ] Funciones verificadas
- [ ] Datos existentes migrados (si aplica)
- [ ] Backend actualizado con nuevos endpoints
- [ ] Tests de creación de jobs
- [ ] Tests de migración guest→user
- [ ] Tests de recuperación al reload
- [ ] Cleanup automático configurado

## 🔄 Rollback

Si necesitas revertir:
```sql
-- Ver rollback section en MIGRATION_GUIDE.md
-- CUIDADO: Esto eliminará datos
```

## 📝 Changelog

### 2025-11-08 - Initial Migration
- Creada tabla `guest_users`
- Modificada tabla `async_jobs` con soporte guest/user
- Creadas funciones de gestión de jobs
- Configurado cleanup automático
- Documentación completa

---

**Versión:** 1.0.0
**Última actualización:** 2025-11-08
**Compatibilidad:** Supabase Postgres 15+
