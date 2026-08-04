import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentExpiryCleanupService } from './appointment-expiry-cleanup.service';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [AvailabilityModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentExpiryCleanupService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
