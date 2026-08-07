import { Controller, Get, Query } from '@nestjs/common';
import { GalleryImagesService } from './gallery-images.service';
import { GetGalleryImagesDto } from './dto/get-gallery-images.dto';

@Controller('gallery-images')
export class GalleryImagesController {
  constructor(private readonly galleryImagesService: GalleryImagesService) {}

  @Get()
  findActive(@Query() query: GetGalleryImagesDto) {
    return this.galleryImagesService.findActive(query);
  }
}
