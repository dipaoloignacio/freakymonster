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
COPY apps/api apps/api
# El resolver de hoisting de npm anidó @nestjs/cli (y su árbol) acá en vez de
# en la raíz, por un choque de versión de `typescript` entre workspaces —
# sin este COPY, `nest build` falla con "nest: not found".
COPY --from=deps /repo/apps/api/node_modules apps/api/node_modules
RUN cd apps/api && npx prisma generate
RUN npm run build -w apps/api

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev

# El cliente de Prisma generado (tipos + engine) no viene con `npm ci` — hay
# que traerlo del builder, ya generado contra este mismo schema.
COPY --from=builder /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /repo/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /repo/apps/api/dist apps/api/dist
COPY --from=builder /repo/apps/api/prisma apps/api/prisma
COPY --from=builder /repo/apps/api/prisma.config.ts apps/api/prisma.config.ts

EXPOSE 3001
ENV PORT=3001
# tsconfig.build.json preserva el prefijo src/ en la salida compilada.
CMD ["node", "apps/api/dist/src/main.js"]
