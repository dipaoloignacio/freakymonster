# Freaky Monster Tattoo Studio — monorepo

Monorepo (npm workspaces) con el frontend en Next.js y el backend en NestJS.

```
apps/
  web/   → Next.js (frontend)
  api/   → NestJS + Prisma (backend)
docker-compose.yml → Postgres local de desarrollo
```

## Levantar el entorno de cero

1. Cloná el repo.

2. Levantá el Postgres local de desarrollo (independiente del Postgres del
   VPS, que se configura al deployar):

   ```bash
   docker compose up -d
   ```

   Esto expone Postgres en el puerto **5433** del host (no el 5432 default,
   por si tenés otro Postgres corriendo en tu máquina para otro proyecto).

3. Instalá las dependencias de todos los workspaces desde la raíz:

   ```bash
   npm install
   ```

4. Copiá los `.env.example` a `.env`:

   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   ```

   - El `.env` de la raíz tiene las credenciales que usa `docker-compose.yml`
     para crear el Postgres (usuario/password/db/puerto).
   - El `.env` de `apps/api` tiene el `DATABASE_URL` que usa Prisma/NestJS
     para conectarse a ese mismo Postgres. Si cambiás algo en el `.env` de
     la raíz, actualizá el `DATABASE_URL` para que coincida.

5. Corré las migraciones de Prisma (crea las tablas en el Postgres local),
   parado en `apps/api`:

   ```bash
   cd apps/api
   npx prisma migrate dev
   cd ../..
   ```

6. Levantá frontend y backend en paralelo, cada uno en su propia terminal:

   ```bash
   npm run dev:web   # http://localhost:3000
   npm run dev:api   # http://localhost:3001
   ```

   Confirmá que el backend levantó bien y puede hablar con la base:

   ```bash
   curl http://localhost:3001/health
   # { "status": "ok" }
   ```

## Scripts disponibles (raíz)

| Script          | Qué hace                                  |
| --------------- | ------------------------------------------ |
| `npm run dev:web`   | Next.js en modo watch (`apps/web`)     |
| `npm run dev:api`   | NestJS en modo watch (`apps/api`)      |
| `npm run build:web` | Build de producción del frontend       |
| `npm run build:api` | Build de producción del backend        |

## Notas

- El Postgres de `docker-compose.yml` es **solo para desarrollo local**. En
  producción (VPS) se configura una base separada y `DATABASE_URL` apunta
  a esa, no a este contenedor.
- El schema de Prisma vive en `apps/api/prisma/schema.prisma`. Después de
  editarlo, corré `npx prisma migrate dev --name <algo>` desde `apps/api`.
