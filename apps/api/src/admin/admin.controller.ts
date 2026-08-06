import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { GetAdminAppointmentsDto } from './dto/get-admin-appointments.dto';
import { UpdateAdminAppointmentDto } from './dto/update-admin-appointment.dto';
import { CreateAvailabilityBlockDto } from './dto/create-availability-block.dto';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SetWeeklyAvailabilityDto } from './dto/set-weekly-availability.dto';
import { CreateGiftCardTierDto } from './dto/create-gift-card-tier.dto';
import { UpdateGiftCardTierDto } from './dto/update-gift-card-tier.dto';
import { CreateAppointmentDto } from '../appointments/dto/create-appointment.dto';
import { artistImageMulterOptions } from './multer-artist-image.config';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('appointments')
  findAppointments(@Query() dto: GetAdminAppointmentsDto) {
    return this.adminService.findAppointments(dto);
  }

  // Alta manual (reserva por teléfono/WhatsApp): mismo body que el POST
  // /appointments público, pero nace CONFIRMED y sin vencimiento de seña.
  // Ver AdminService.createAppointment().
  @Post('appointments')
  createAppointment(@Body() dto: CreateAppointmentDto) {
    return this.adminService.createAppointment(dto);
  }

  @Patch('appointments/:id')
  updateAppointment(@Param('id') id: string, @Body() dto: UpdateAdminAppointmentDto) {
    return this.adminService.updateAppointment(id, dto);
  }

  @Get('availability-blocks')
  findAvailabilityBlocks() {
    return this.adminService.listAvailabilityBlocks();
  }

  // Sin artistId en el body, bloquea para todos los tatuadores activos.
  @Post('availability-blocks')
  createAvailabilityBlock(@Body() dto: CreateAvailabilityBlockDto) {
    return this.adminService.createAvailabilityBlock(dto);
  }

  @Delete('availability-blocks/:id')
  deleteAvailabilityBlock(@Param('id') id: string) {
    return this.adminService.deleteAvailabilityBlock(id);
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

  // Borra de verdad solo si el tatuador nunca tuvo turnos; si los tiene,
  // degrada a desactivación. Ver AdminService.deleteArtist().
  // Para solo desactivar: PATCH artists/:id con active=false.
  @Delete('artists/:id')
  deleteArtist(@Param('id') id: string) {
    return this.adminService.deleteArtist(id);
  }

  @Get('artists/:id/availability')
  getWeeklyAvailability(@Param('id') id: string) {
    return this.adminService.getWeeklyAvailability(id);
  }

  // PUT y no PATCH: reemplaza la semana entera. Ver SetWeeklyAvailabilityDto.
  @Put('artists/:id/availability')
  setWeeklyAvailability(@Param('id') id: string, @Body() dto: SetWeeklyAvailabilityDto) {
    return this.adminService.setWeeklyAvailability(id, dto);
  }

  @Get('services')
  findServices() {
    return this.adminService.listServices();
  }

  @Post('services')
  createService(@Body() dto: CreateServiceDto) {
    return this.adminService.createService(dto);
  }

  @Patch('services/:id')
  updateService(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.adminService.updateService(id, dto);
  }

  // Borra de verdad solo si el servicio nunca se usó; si ya tiene turnos,
  // degrada a desactivación. Ver AdminService.deleteService().
  @Delete('services/:id')
  deleteService(@Param('id') id: string) {
    return this.adminService.deleteService(id);
  }

  @Post('artists/:artistId/services/:serviceId')
  assignServiceToArtist(@Param('artistId') artistId: string, @Param('serviceId') serviceId: string) {
    return this.adminService.assignServiceToArtist(artistId, serviceId);
  }

  @Delete('artists/:artistId/services/:serviceId')
  unassignServiceFromArtist(@Param('artistId') artistId: string, @Param('serviceId') serviceId: string) {
    return this.adminService.unassignServiceFromArtist(artistId, serviceId);
  }

  // Montos de gift card. Devuelve activos e inactivos: es la vista de
  // administración. No hay DELETE — desactivar es un PATCH con active=false, y
  // borrar un tier no aportaría nada porque las gift cards ya emitidas no lo
  // referencian (ver AdminService y el comentario de GiftCard.amount).
  @Get('gift-card-tiers')
  findGiftCardTiers() {
    return this.adminService.listGiftCardTiers();
  }

  @Post('gift-card-tiers')
  createGiftCardTier(@Body() dto: CreateGiftCardTierDto) {
    return this.adminService.createGiftCardTier(dto);
  }

  @Patch('gift-card-tiers/:id')
  updateGiftCardTier(@Param('id') id: string, @Body() dto: UpdateGiftCardTierDto) {
    return this.adminService.updateGiftCardTier(id, dto);
  }
}
