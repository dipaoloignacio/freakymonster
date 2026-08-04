import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Todo vive bajo un solo dominio: Nginx manda /api/* acá tal cual (sin
  // sacar el prefijo), así que las rutas internas tienen que responder en
  // /api/... para coincidir. Confirmado con curl real, no es solo teoría —
  // ver Fase 8 (deploy) del README.
  app.setGlobalPrefix('api');

  // CORS deshabilitado a propósito: frontend y backend quedan bajo el mismo
  // origen (freakymonster.dipaoloproyects.space) detrás de Nginx, así que el
  // navegador nunca hace una request cross-origin hacia esta API. Si en el
  // futuro el frontend se separa a otro dominio (o se agrega una app
  // mobile/otro cliente en otro origen), va a hacer falta volver a habilitar
  // esto con app.enableCors({ origin: [...] }) — no lo saqué, lo dejo acá
  // documentado para que no se reintroduzca a ciegas.
  // app.enableCors({ origin: ['https://ejemplo-de-otro-origen.com'] });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
