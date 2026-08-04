import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Limpieza de datos, no de disponibilidad: el filtro en
 * AvailabilityService.findBusyAppointments ya excluye en tiempo real los
 * PENDING vencidos (el slot se libera solo, sin depender de este cron). Este
 * job solo pasa esos turnos a CANCELLED (nunca los borra) para que la tabla
 * no se llene de turnos fantasma PENDING para siempre.
 */
@Injectable()
export class AppointmentExpiryCleanupService {
  private readonly logger = new Logger(AppointmentExpiryCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cancelExpiredPendingAppointments() {
    const { count } = await this.prisma.appointment.updateMany({
      where: {
        status: AppointmentStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: { status: AppointmentStatus.CANCELLED },
    });

    if (count > 0) {
      this.logger.log(`Cancelados ${count} turno(s) PENDING vencido(s).`);
    }
  }
}
