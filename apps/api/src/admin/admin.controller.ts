import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { GetAdminAppointmentsDto } from './dto/get-admin-appointments.dto';
import { UpdateAdminAppointmentDto } from './dto/update-admin-appointment.dto';
import { CreateAvailabilityBlockDto } from './dto/create-availability-block.dto';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { artistImageMulterOptions } from './multer-artist-image.config';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('appointments')
  findAppointments(@Query() dto: GetAdminAppointmentsDto) {
    return this.adminService.findAppointments(dto);
  }

  @Patch('appointments/:id')
  updateAppointment(@Param('id') id: string, @Body() dto: UpdateAdminAppointmentDto) {
    return this.adminService.updateAppointment(id, dto);
  }

  @Post('availability-blocks')
  createAvailabilityBlock(@Body() dto: CreateAvailabilityBlockDto) {
    return this.adminService.createAvailabilityBlock(dto);
  }

  @Get('artists')
  findArtists() {
    return this.adminService.listArtists();
  }

  @Post('artists')
  @UseInterceptors(FileInterceptor('image', artistImageMulterOptions))
  createArtist(@Body() dto: CreateArtistDto, @UploadedFile() file?: Express.Multer.File) {
    return this.adminService.createArtist(dto, file);
  }

  @Patch('artists/:id')
  @UseInterceptors(FileInterceptor('image', artistImageMulterOptions))
  updateArtist(@Param('id') id: string, @Body() dto: UpdateArtistDto, @UploadedFile() file?: Express.Multer.File) {
    return this.adminService.updateArtist(id, dto, file);
  }

  @Delete('artists/:id')
  deactivateArtist(@Param('id') id: string) {
    return this.adminService.deactivateArtist(id);
  }
}
