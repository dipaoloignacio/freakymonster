import { randomUUID } from 'crypto';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { ARTIST_IMAGES_DIR } from '../uploads.constants';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
