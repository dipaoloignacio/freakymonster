# Build context: raíz del monorepo (mismo motivo que apps/web/Dockerfile).

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/package.json /repo/package-lock.json ./
# El resolver de hoisting de npm anidó @nestjs/cli (y su árbol) acá en vez de
# en la raíz, por un choque de versión de `typescript` entre workspaces —
# sin este COPY, `nest build` falla con "nest: not found".
COPY --from=deps /repo/apps/api/node_modules apps/api/node_modules

# El schema va ANTES que el resto del código: `prisma generate` solo depende de
# él, así que un cambio en un .ts no invalida esta capa y el generate se saltea
# en los rebuilds del día a día.
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts
COPY apps/api/package.json apps/api/package.json
RUN cd apps/api && npx prisma generate

COPY apps/api apps/api
RUN npm run build -w apps/api

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
# Los manifiestos van antes que cualquier código: mientras no cambien, Docker
# reusa la capa del install completo aunque se haya tocado toda la aplicación.
# El package.json de apps/web se copia aunque la API no lo use — `npm ci`
# valida el lockfile contra TODOS los workspaces y falla si falta uno.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

# --workspace=apps/api es el cambio grande: sin él, `npm ci` desde la raíz
# instalaba también las dependencias de apps/web (Next, React, sharp), unos
# 380 MB de cosas que esta imagen no ejecuta nunca. Medido con docker history,
# esa sola capa pesaba 1.06 GB de una imagen de 1.28 GB; acotarla al workspace
# la dejó en 491 MB y la imagen en 716 MB.
RUN npm ci --omit=dev --workspace=apps/api --include-workspace-root

# El cliente de Prisma generado (tipos + engine) no viene con `npm ci` — hay
# que traerlo del builder, ya generado contra este mismo schema.
COPY --from=builder /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /repo/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /repo/apps/api/dist apps/api/dist
COPY --from=builder /repo/apps/api/prisma apps/api/prisma
COPY --from=builder /repo/apps/api/prisma.config.ts apps/api/prisma.config.ts
COPY apps/api/docker-entrypoint.sh apps/api/docker-entrypoint.sh
RUN chmod +x apps/api/docker-entrypoint.sh

EXPOSE 3001
ENV PORT=3001
# El entrypoint aplica las migraciones pendientes y después ejecuta el CMD.
# Si fallan, corta ahí y el contenedor no levanta — ver el script.
ENTRYPOINT ["/repo/apps/api/docker-entrypoint.sh"]
# tsconfig.build.json preserva el prefijo src/ en la salida compilada.
CMD ["node", "apps/api/dist/src/main.js"]
