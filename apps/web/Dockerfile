# Build context: raíz del monorepo (necesita el package-lock.json compartido
# y los package.json de los otros workspaces para que `npm ci` valide el
# lockfile correctamente). Ver docker-compose.prod.yml.

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/package.json /repo/package-lock.json ./
COPY apps/web apps/web
COPY apps/api/package.json apps/api/package.json
RUN npm run build -w apps/web

# En un monorepo con npm workspaces, `output: standalone` anida el resultado
# bajo el path del workspace (apps/web/server.js, no server.js suelto) y NO
# copia public/ ni .next/static/ — hay que traerlos a mano.
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static

USER nextjs
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
