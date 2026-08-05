import 'dotenv/config';
import { mkdirSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ARTIST_IMAGES_DIR, UPLOADS_DIR } from './uploads.constants';

async function bootstrap() {
  // multer no crea directorios intermedios solo — si uploads/artists no
  // existe (primer arranque en un volumen nuevo), los uploads fallarían.
  mkdirSync(ARTIST_IMAGES_DIR, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Sirve apps/api/uploads/ como estático bajo /api/uploads/ — mismo
  // prefijo que setGlobalPrefix('api') usa para las rutas de controllers,
  // pero useStaticAssets no lo hereda automáticamente, así que hay que
  // escribirlo a mano acá.
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/api/uploads/' });

  // Todo vive bajo un solo dominio: Nginx manda /api/* acá tal cual (sin
  // sacar el prefijo), así que las rutas internas tienen que responder en
  // /api/... para coincidir. Confirmado con curl real, no es solo teoría —
  // ver Fase 8 (deploy) del README.
  app.setGlobalPrefix('api');

  // CORS solo en desarrollo local: ahí `apps/web` (3000) y `apps/api` (3001)
  // son dos orígenes distintos, así que el navegador exige el header. En
  // producción quedan bajo el mismo origen detrás de Nginx (/api/*), no hay
  // request cross-origin real y no hace falta — por eso esto está atado a
  // NODE_ENV en vez de habilitado siempre. El Dockerfile de producción fija
  // NODE_ENV=production en la imagen final (ver apps/api/Dockerfile), y en
  // dev (`npm run dev:api`) nunca se setea, así que la condición de abajo
  // es un signal confiable sin necesitar una env var nueva.
  if (process.env.NODE_ENV !== 'production') {
    app.enableCors({ origin: 'http://localhost:3000' });
  }

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
