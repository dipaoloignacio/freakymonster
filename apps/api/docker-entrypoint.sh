#!/bin/sh
#
# Aplica las migraciones pendientes y recién ahí levanta el server.
#
# Existe porque el deploy no las corría: la imagen subía con migraciones
# nuevas adentro, el server arrancaba igual, y el esquema de la base quedaba
# como estaba. Se acumulaban sin aplicar hasta que algún endpoint tocaba una
# columna inexistente y devolvía 500 — que es exactamente lo que pasó con
# Service.active y GET /api/artists/:id/services.
#
# `set -e` es lo importante: si `migrate deploy` falla, el script corta acá y
# el contenedor termina con código distinto de cero. Preferimos que el arranque
# falle entero y ruidosamente antes que servir tráfico con el esquema a medio
# aplicar, donde los errores aparecen salteados y mucho más tarde.
set -e

# `migrate deploy` es idempotente: las ya aplicadas se saltean, así que correr
# esto en cada arranque no cuesta nada. Tampoco genera migraciones ni resetea
# la base — a diferencia de `migrate dev`, nunca destruye datos.
#
# El cd es necesario: el schema y prisma.config.ts viven en apps/api, y el
# WORKDIR de la imagen es la raíz del monorepo.
cd /repo/apps/api
echo "[entrypoint] Aplicando migraciones pendientes…"
npx prisma migrate deploy
cd /repo

# exec para que el server reemplace a este script como PID 1 y reciba las
# señales de Docker (SIGTERM en un `docker stop`); si no, el shell se las come
# y el contenedor muere de un timeout en vez de cerrar prolijamente.
echo "[entrypoint] Migraciones al día, levantando la API…"
exec "$@"
