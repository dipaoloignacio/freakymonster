import { Controller, Get, Param } from '@nestjs/common';
import { ArtistsService } from './artists.service';

@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Get()
  findActiveArtists() {
    return this.artistsService.findActiveArtists();
  }

  @Get(':id/services')
  findServicesForArtist(@Param('id') id: string) {
    return this.artistsService.findServicesForArtist(id);
  }
}
