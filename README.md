# Freaky Monster Tattoo Studio — monorepo

Monorepo (npm workspaces) con el frontend en Next.js y el backend en NestJS.

```
apps/
  web/   → Next.js (frontend)
  api/   → NestJS + Prisma (backend)
docker-compose.yml      → Postgres local de desarrollo
docker-compose.prod.yml → stack completo de producción (postgres + api + web)
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
   curl http://localhost:3001/api/health
   # { "status": "ok" }
   ```

   (Las rutas del backend viven bajo `/api/*` — ver `setGlobalPrefix('api')`
   en `apps/api/src/main.ts` — tanto en local como en producción.)

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

## Deploy a producción

El sitio vive en `https://freakymonster.dipaoloproyects.space`, en un VPS
compartido con otros proyectos (algunos con PM2, otros con Docker), detrás
de un **Nginx único** que rutea por path: `/api/*` va al backend, todo lo
demás al frontend. Nada de Vercel, nada de Caddy — se suma a la infra que
ya existe en el servidor.

**Arquitectura del deploy:**

```
Internet → Nginx (443, con Certbot) ──/api/*──→ 127.0.0.1:3301 (api)
                                     └──resto──→ 127.0.0.1:3300 (web)

api/web ──(red interna Docker)──→ postgres (sin puerto publicado al host)
```

`api` y `web` publican **solo en `127.0.0.1`** (nunca `0.0.0.0`) — únicamente
Nginx, corriendo en la misma máquina, puede llegar a ellos. `postgres` no
publica ningún puerto al host: solo es alcanzable por los otros contenedores
del mismo `docker-compose.prod.yml`, vía la red interna de Docker.

### Repetir el deploy desde cero (o deployar una actualización)

Todo esto se corre por SSH en el VPS (alias `contabosv` en este proyecto).
El servidor no tiene sudo sin contraseña configurado, así que los pasos que
tocan `/etc/nginx/` o certificados los tiene que correr una persona con la
contraseña — no se pueden automatizar del todo por SSH no interactivo.

1. **Clonar (o actualizar) el repo** en `~/apps/freakymonster`, siguiendo la
   misma convención de carpetas que los otros proyectos del servidor:

   ```bash
   git clone https://github.com/dipaoloignacio/freakymonster.git ~/apps/freakymonster
   # o, si ya existe:
   cd ~/apps/freakymonster && git pull origin main
   ```

2. **Crear `.env.production`** en la raíz del repo clonado (`~/apps/freakymonster/.env.production`) —
   **no está en git**, hay que crearlo a mano en el servidor cada vez que se
   monta un VPS nuevo. Variables que necesita (ver `docker-compose.prod.yml`):

   ```env
   POSTGRES_USER=...
   POSTGRES_PASSWORD=...
   POSTGRES_DB=...
   API_PORT=3301
   WEB_PORT=3300
   MP_ACCESS_TOKEN=...       # Access Token de PRODUCCIÓN de Mercado Pago
   RESEND_API_KEY=...        # API key de PRODUCCIÓN de Resend
   NOTIFICATION_FROM_EMAIL=...    # remitente de un dominio verificado en Resend
   STUDIO_NOTIFICATION_EMAIL=...  # mail real del estudio
   ```

   ⚠️ Las credenciales de **sandbox** de Mercado Pago/Resend usadas en
   desarrollo (Fases 5/6) **no van acá** — son de un usuario de prueba y no
   sirven en producción. Si el estudio todavía no tiene sus cuentas reales,
   usar placeholders bien visibles: el resto del stack funciona igual (turnos,
   disponibilidad), solo falla el cobro de seña y el envío de mails hasta que
   se reemplacen por credenciales reales.

3. **Levantar el stack** (esto buildea las imágenes desde cero la primera
   vez, y puede tardar varios minutos según la red del VPS — no se cuelga,
   solo es lento bajando `npm ci` y las fuentes de Google Fonts):

   ```bash
   cd ~/apps/freakymonster
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```

4. **Correr las migraciones** contra el Postgres de producción (`migrate
   deploy`, nunca `migrate dev`, en prod no se generan migraciones nuevas):

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production \
     exec api sh -c "cd apps/api && npx prisma migrate deploy"
   ```

5. **Configurar Nginx** (solo hace falta la primera vez que se monta el
   servidor — si ya existe `/etc/nginx/sites-available/freakymonster`, saltar
   a este paso salvo que haya cambiado el routing). El config de referencia
   vive versionado en `deploy/nginx/freakymonster.conf`. Copiarlo al VPS
   (`scp` o pegándolo a mano) y desde ahí, con sudo:

   ```bash
   sudo cp deploy/nginx/freakymonster.conf /etc/nginx/sites-available/freakymonster
   sudo ln -s /etc/nginx/sites-available/freakymonster /etc/nginx/sites-enabled/freakymonster   # solo la primera vez
   sudo nginx -t                        # validar SIEMPRE antes de recargar
   sudo systemctl reload nginx          # nunca restart en caliente
   ```

   El bloque de Nginx manda `/api/*` **tal cual, sin sacar el prefijo**
   (`proxy_pass http://localhost:3301;` sin barra final) porque el backend
   tiene `app.setGlobalPrefix('api')` — si el proxy_pass tuviera una barra
   final, Nginx recortaría el `/api` antes de reenviar y todo rompería.

6. **Certificado SSL** (solo la primera vez; después Certbot renueva solo).
   Confirmar antes que el DNS ya propagó:

   ```bash
   dig freakymonster.dipaoloproyects.space +short   # tiene que devolver la IP del VPS
   sudo certbot --nginx -d freakymonster.dipaoloproyects.space
   ```

### Verificar que quedó bien

```bash
# Desde el VPS o desde cualquier máquina:
curl https://freakymonster.dipaoloproyects.space/api/health
# { "status": "ok" }
curl -I https://freakymonster.dipaoloproyects.space
# HTTP/2 200

# Confirmar que no se rompió nada de los otros proyectos del servidor:
docker ps          # oficios-pro-api / oficios-postgres siguen arriba
pm2 list           # chatup-api, chatup-bot, parties-api, ws-mapbox-api siguen online
```

### Cosas a tener en cuenta

- El frontend (`apps/web`) **todavía no consume la API propia** — el flujo
  de reservas actual usa el embed de Cal.com (`BookingModal.tsx`). El
  backend (`/api/availability`, `/api/appointments`, `/api/payments/*`)
  está desplegado y funcionando, pero nada lo llama todavía desde la UI.
  Esto es una decisión consciente, no un olvido — ver el historial del
  proyecto (Fase 8) si hace falta más contexto.
- Sin credenciales reales de Mercado Pago/Resend en `.env.production`, la
  creación de turnos y disponibilidad funcionan igual; lo que falla es
  generar la preferencia de pago y el envío de emails de confirmación
  (fallan de forma controlada, no tiran abajo el turno ya creado).
- Este VPS **no tiene sudo sin contraseña**. Cualquier cambio a Nginx o a
  certificados necesita a alguien con la contraseña corriendo esos comandos
  a mano — no se puede automatizar por SSH no interactivo.
