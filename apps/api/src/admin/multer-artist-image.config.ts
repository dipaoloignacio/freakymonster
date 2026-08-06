import { randomUUID } from 'crypto';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { ARTIST_IMAGES_DIR } from '../uploads.constants';

// 10 MB para que entre una foto de celular sin comprimir, que es lo que el
// estudio sube en la práctica. No afecta lo que descarga un visitante: el
// original se guarda tal cual, pero next/image lo sirve redimensionado y en
// formato moderno, así que el peso de la página no depende de este número.
//
// Tiene que coincidir con el client_max_body_size de Nginx: si Nginx corta
// antes, la request muere en el proxy con un 413 y el backend ni se entera —
// era exactamente el síntoma, porque Nginx no tenía la directiva y aplicaba
// su default de 1 MB.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const artistImageMulterOptions = {
  storage: diskStorage({
    destination: ARTIST_IMAGES_DIR,
    filename: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      cb(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new BadRequestException('El archivo tiene que ser una imagen'), false);
      return;
    }
    cb(null, true);
  },
};
