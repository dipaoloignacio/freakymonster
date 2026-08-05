import { join } from 'path';

// Directorio físico donde se guardan archivos subidos (por ahora, fotos de
// tatuadores). Vive en apps/api/uploads/ tanto en dev como en el contenedor
// de producción — ahí está montado como volumen de Docker para que persista
// entre rebuilds (ver docker-compose.prod.yml). main.ts lo sirve como
// estático bajo /api/uploads/, lo que Nginx ya reenvía sin cambios (todo
// /api/* va al backend).
//
// Este archivo tiene que quedar en la raíz de src/ (no en una subcarpeta):
// tsconfig.build preserva el prefijo src/ en dist/, así que compilado
// termina en dist/src/uploads.constants.js — subir dos niveles desde ahí
// (dist/src -> dist -> apps/api) da la carpeta correcta. Si se mueve a una
// subcarpeta de src/, este cálculo se rompe.
export const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads');
export const ARTIST_IMAGES_DIR = join(UPLOADS_DIR, 'artists');
export const ARTIST_IMAGES_URL_PREFIX = '/api/uploads/artists';
