import { Module } from '@nestjs/common';
import { GalleryImagesController } from './gallery-images.controller';
import { GalleryImagesService } from './gallery-images.service';

@Module({
  controllers: [GalleryImagesController],
  providers: [GalleryImagesService],
})
export class GalleryImagesModule {}
