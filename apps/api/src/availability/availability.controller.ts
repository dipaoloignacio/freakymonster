import { Controller, Get, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import { GetMonthAvailabilityDto } from './dto/get-month-availability.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  getAvailability(@Query() dto: GetAvailabilityDto) {
    return this.availabilityService.getAvailableSlots(dto);
  }

  // Declarada antes que @Get() no haría falta (las rutas no chocan), pero sí
  // importa que sea un path fijo: devuelve solo las fechas con al menos un
  // hueco, para pintar el calendario del wizard de una sola pasada.
  @Get('month')
  getMonthAvailability(@Query() dto: GetMonthAvailabilityDto) {
    return this.availabilityService.getMonthAvailability(dto);
  }
}
