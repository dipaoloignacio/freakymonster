import { randomUUID } from 'crypto';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { GALLERY_IMAGES_DIR } from '../uploads.constants';

// Mismo límite que las fotos de tatuadores (ver multer-artist-image.config.ts):
// 10 MB para que entre una foto de celular sin comprimir, que es lo que el
// estudio sube en la práctica. Tiene que seguir coincidiendo con el
// client_max_body_size de Nginx — si Nginx corta antes, la request muere en el
// proxy con un 413 y el backend ni se entera.
//
// No afecta lo que descarga un visitante: el original se guarda tal cual pero
// next/image lo sirve redimensionado y en formato moderno.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const galleryImageMulterOptions = {
  storage: diskStorage({
    destination: GALLERY_IMAGES_DIR,
    filename: (
      _req: unknown,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void,
    ) => {
      // Nombre nuevo por archivo: el original puede venir con espacios,
      // acentos o repetido ("IMG_0001.jpg" en dos celulares distintos), y
      // además así una foto reemplazada nunca queda cacheada con la anterior.
      cb(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new BadRequestException('El archivo tiene que ser una imagen'), false);
      return;
    }
    cb(null, true);
  },
};
